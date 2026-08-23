from flask import Blueprint, request, jsonify
from app import db
from app.models.production_model import Production, ProductionProduct
from app.models.operator_model import Operator
from app.models.user_model import User
from app.models.product_model import Product
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func
from app.utils.timezone import to_local, to_utc_naive, CL_TZ
from sqlalchemy.exc import IntegrityError
from flask_cors import CORS
from collections import defaultdict
from app.routes.product_routes import normalize_product_name, normalize_search, normalize_db_column
from app.models.operator_activity_model import OperatorActivity
from app.utils.performance import invalidate_performance_caches

production_bp = Blueprint("productions", __name__)
CORS(
    production_bp,
    resources={r"/*": {"origins": "*"}},
    supports_credentials=True,
)

def _upsert_or_clear_operator_activity(operator_id: int, fecha, horas, nota, user_id, tipo: str = "otra"):
    """
    Filtra también por 'tipo' ('otra' o
    'extra'), para poder tener el mismo día un registro de otra actividad
    Y uno de horas extra, de forma independiente.
    """
    existing = OperatorActivity.query.filter_by(operator_id=operator_id, fecha=fecha, tipo=tipo).first()

    if horas is None or horas == "" or float(horas) <= 0:
        if existing:
            db.session.delete(existing)
        return

    horas_val = float(horas)
    nota_val = (nota or "").strip()
    if existing:
        existing.horas = horas_val
        existing.nota = nota_val
    else:
        db.session.add(
            OperatorActivity(
                operator_id=operator_id,
                fecha=fecha,
                horas=horas_val,
                nota=nota_val,
                created_by=user_id,
                tipo=tipo,
            )
        )


def _parse_horas_producto(value):
    """
    Convierte el campo opcional 'horas' de una línea de producto (horas
    reales dedicadas a ese producto ese día) a float, o None si no viene,
    viene vacío, no es un número válido, o es <= 0. Con None, el cálculo
    de rendimiento reparte las horas del día en partes iguales entre los
    productos sin horas manuales, igual que se hacía antes de que
    existiera este campo — así los registros históricos no cambian.
    """
    if value is None or value == "":
        return None
    try:
        horas = float(value)
    except (TypeError, ValueError):
        return None
    return horas if horas > 0 else None


@production_bp.route("/productions", methods=["POST"])
@jwt_required()
def create_production():
    try:
        data = request.get_json() or {}
        if not data.get("operator") or data.get("productos", []) == []:
            return jsonify({"error": "Faltan campos requeridos (operator, productos)"}), 400

        user_id = get_jwt_identity()
        operator_name = data["operator"]
        productos = data.get("productos", [])

        operator_norm = " ".join((operator_name or "").strip().split())
        operator = Operator.query.filter(func.lower(Operator.name) == operator_norm.lower()).first()
        if not operator:
            operator = Operator(name=operator_norm, created_by=user_id)
            db.session.add(operator)
            db.session.flush()

        new_production = Production(
            operator_id=operator.id,
            operator_name=operator.name,
            created_by=user_id,
        )

        # Fecha real a la que pertenece la producción: por defecto "ahora",
        # pero puede elegirse manualmente (ej. producción del viernes que
        # recién se registra el lunes siguiente). Se conserva la hora actual
        # del reloj y solo se reemplaza el día, para que el registro siga
        # teniendo un timestamp realista.
        fecha_str = (data.get("fecha") or "").strip()
        now_local = datetime.now(CL_TZ)
        if fecha_str:
            try:
                chosen_date = datetime.strptime(fecha_str, "%Y-%m-%d").date()
            except ValueError:
                return jsonify({"error": "Formato de fecha inválido, use YYYY-MM-DD"}), 400
            local_dt = datetime.combine(chosen_date, now_local.timetz())
        else:
            chosen_date = now_local.date()
            local_dt = now_local
        new_production.fecha = to_utc_naive(local_dt)

        db.session.add(new_production)

        for p in productos:
            if not all(k in p for k in ("nombre", "cantidad", "unidad")):
                return jsonify({"error": "Faltan campos en productos (nombre, cantidad, unidad)"}), 400

            nombre = (p["nombre"] or "").strip()
            nombre_key = normalize_product_name(nombre)
            prod_row = next((p for p in Product.query.all() if normalize_product_name(p.name) == nombre_key), None)
            if not prod_row:
                db.session.add(Product(name=nombre, category="Otros", created_by=user_id, stock=0.0))
                db.session.flush()

            db.session.add(
                ProductionProduct(
                    nombre=nombre,
                    cantidad=p["cantidad"],
                    unidad=p["unidad"],
                    horas=_parse_horas_producto(p.get("horas")),
                    production=new_production,
                )
            )

            prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
            if prod_row:
                try:
                    prod_row.stock = float(prod_row.stock or 0) + float(p["cantidad"] or 0)
                except Exception:
                    pass

        # Registrar de una vez, opcionalmente, las horas de otras
        # actividades o horas extras del operario para esa misma fecha (queda guardado en
        # el mismo registro de actividades que usa el rendimiento de
        # producción, sin necesidad de ir a otra pantalla).
        if "horas_otras" in data:
            _upsert_or_clear_operator_activity(
                operator.id, chosen_date, data.get("horas_otras"), data.get("nota_otras"), user_id, tipo="otra"
            )
        if "horas_extra" in data:
            _upsert_or_clear_operator_activity(
                operator.id, chosen_date, data.get("horas_extra"), data.get("nota_extra"), user_id, tipo="extra"
            )

        db.session.commit()
        invalidate_performance_caches()
        return jsonify(new_production.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

@production_bp.route("/productions", methods=["GET"])
@jwt_required()
def get_productions():
    try:
        search_operator = normalize_search(request.args.get("operator") or "")
        search_user = normalize_search(request.args.get("user") or "")
        search_product = normalize_search(request.args.get("product") or "")
        date_from_str = (request.args.get("date_from") or "").strip()
        date_to_str = (request.args.get("date_to") or "").strip()
        
        # Paginación
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 10))
        all_param = request.args.get("all")  #línea para soportar exportación de todos los datos

        query = Production.query

        if search_operator:
            query = query.outerjoin(Operator, Operator.id == Production.operator_id).filter(
                db.or_(
                    normalize_db_column(Operator.name).like(f"%{search_operator}%"),
                    normalize_db_column(Production.operator_name).like(f"%{search_operator}%")
                )
            )

        if search_user:
            query = query.join(User, User.id == Production.created_by).filter(
                normalize_db_column(User.name).like(f"%{search_user}%")
            )

        if search_product:
            query = query.join(ProductionProduct, ProductionProduct.production_id == Production.id).filter(
                normalize_db_column(ProductionProduct.nombre).like(f"%{search_product}%")
            ).distinct()

        if date_from_str:
            date_to_str = date_to_str or date_from_str
            try:
                d_from = datetime.strptime(date_from_str, "%Y-%m-%d")
                d_to = datetime.strptime(date_to_str, "%Y-%m-%d")
                if d_from > d_to:
                    d_from, d_to = d_to, d_from
                start_local = d_from.replace(tzinfo=CL_TZ)
                end_local = (d_to + timedelta(days=1)).replace(tzinfo=CL_TZ)
                a_start = to_utc_naive(start_local)
                a_end = to_utc_naive(end_local)
                query = query.filter(Production.fecha >= a_start, Production.fecha < a_end)
            except ValueError:
                return jsonify({"error": "Formato de fecha inválido en date_from/date_to, use YYYY-MM-DD"}), 400

        query = query.order_by(Production.fecha.asc())

        # Aplicar paginación o fetching completo según parámetro 'all'
        if all_param:
            productions = query.all()
        else:
            productions = query.paginate(page=page, per_page=limit, error_out=False).items

        result = []
        for p in productions:
            operator = Operator.query.get(p.operator_id) if p.operator_id else None
            creator = User.query.get(p.created_by)
            operator_display = (operator.name if operator else None) or p.operator_name or "(operario eliminado)"
            result.append(
                {
                    "id": p.id,
                    "operator": operator_display,
                    "operator_id": p.operator_id,
                    "created_by": creator.name if creator else p.created_by,
                    "fecha": to_local(p.fecha).isoformat(timespec="seconds"),
                                        "productos": [
                        {"nombre": pr.nombre, "cantidad": pr.cantidad, "unidad": pr.unidad, "horas": pr.horas} for pr in p.productos
                    ],
                }
            )
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500
    
@production_bp.route("/productions/<int:production_id>", methods=["DELETE"])
@jwt_required()
def delete_production(production_id):
    try:
        production = Production.query.get_or_404(production_id)
        
        # Revertir el stock de los productos
        for product in production.productos:
            prod_row = Product.query.filter(func.lower(Product.name) == func.lower(product.nombre)).first()
            if prod_row:
                try:
                    prod_row.stock = float(prod_row.stock or 0) - float(product.cantidad or 0)
                except Exception:
                    pass

        # Eliminar los productos de la producción
        for product in production.productos:
            db.session.delete(product)

        # Eliminar la producción
        db.session.delete(production)
        db.session.commit()
        invalidate_performance_caches()

        return jsonify({"message": "Producción eliminada y stock revertido"}), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "No se puede eliminar la producción porque está referenciada por otros registros"}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo eliminar la producción", "details": str(e)}), 500
    
@production_bp.route("/productions/<int:production_id>", methods=["PUT"])
@jwt_required()
def update_production(production_id):
    try:
        data = request.get_json() or {}
        if not data.get("operator") or not data.get("productos"):
            return jsonify({"error": "Faltan campos requeridos (operator, productos)"}), 400

        production = Production.query.get_or_404(production_id)
        user_id = get_jwt_identity()

        # Actualizar operario
        operator_name = data["operator"]
        operator_norm = " ".join((operator_name or "").strip().split())
        operator = Operator.query.filter(func.lower(Operator.name) == operator_norm.lower()).first()
        if not operator:
            operator = Operator(name=operator_norm, created_by=user_id)
            db.session.add(operator)
            db.session.flush()
        production.operator_id = operator.id
        production.operator_name = operator.name

        # Fecha real de la producción: si se envía, reemplaza el día
        # conservando la hora original del registro (misma lógica que en
        # la creación), para poder corregir a qué día pertenece la
        # producción sin perder un timestamp realista.
        if "fecha" in data and data.get("fecha"):
            try:
                chosen_date = datetime.strptime(data["fecha"], "%Y-%m-%d").date()
            except ValueError:
                return jsonify({"error": "Formato de fecha inválido, use YYYY-MM-DD"}), 400
            hora_actual = to_local(production.fecha).timetz()
            production.fecha = to_utc_naive(datetime.combine(chosen_date, hora_actual))
        else:
            chosen_date = to_local(production.fecha).date()

        # Calcular cantidades antiguas sumadas por nombre
        old_qty_by_name = defaultdict(float)
        for p in production.productos:
            old_qty_by_name[p.nombre] += float(p.cantidad or 0)

        # Eliminar productos existentes
        for product in production.productos:
            db.session.delete(product)

        # Crear productos nuevos si no existen y preparar nuevas cantidades sumadas
        new_qty_by_name = defaultdict(float)
        for p in data["productos"]:
            if not all(k in p for k in ("nombre", "cantidad", "unidad")):
                db.session.rollback()
                return jsonify({"error": "Faltan campos en productos (nombre, cantidad, unidad)"}), 400
            nombre = (p["nombre"] or "").strip()
            nombre_key = normalize_product_name(nombre)
            prod_row = next((p for p in Product.query.all() if normalize_product_name(p.name) == nombre_key), None)
            if not prod_row:
                db.session.add(Product(name=nombre, category="Otros", created_by=user_id, stock=0.0))
            new_qty_by_name[nombre] += float(p["cantidad"] or 0)

        db.session.flush()  # Asegurar que nuevos productos estén en DB

        # Ajustar stock para todos los nombres involucrados
        all_names = set(old_qty_by_name.keys()) | set(new_qty_by_name.keys())
        for nombre in all_names:
            old_q = old_qty_by_name[nombre]
            new_q = new_qty_by_name[nombre]
            delta = new_q - old_q
            if delta != 0:
                prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
                if prod_row:
                    prod_row.stock = float(prod_row.stock or 0) + delta

                # Agregar nuevos productos a la production
        for p in data["productos"]:
            nombre = (p["nombre"] or "").strip()
            db.session.add(
                ProductionProduct(
                    nombre=nombre,
                    cantidad=p["cantidad"],
                    unidad=p["unidad"],
                    horas=_parse_horas_producto(p.get("horas")),
                    production=production,
                )
            )

        # Registrar, editar o quitar (si horas_otras llega en 0/None) las
        # horas de otras actividades del operario para la fecha final de
        # esta producción, directamente desde el formulario de edición.
        if "horas_otras" in data:
            _upsert_or_clear_operator_activity(
                operator.id, chosen_date, data.get("horas_otras"), data.get("nota_otras"), user_id, tipo="otra"
            )
        if "horas_extra" in data:
            _upsert_or_clear_operator_activity(
                operator.id, chosen_date, data.get("horas_extra"), data.get("nota_extra"), user_id, tipo="extra"
            )
            
        db.session.commit()
        invalidate_performance_caches()

        creator = User.query.get(production.created_by)
        return jsonify({
            "id": production.id,
            "operator": operator.name,
            "operator_id": production.operator_id,
            "created_by": creator.name if creator else production.created_by,
            "fecha": to_local(production.fecha).isoformat(timespec="seconds"),
                        "productos": [
                {"nombre": pr.nombre, "cantidad": pr.cantidad, "unidad": pr.unidad, "horas": pr.horas} for pr in production.productos
            ],
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo actualizar la producción", "details": str(e)}), 500