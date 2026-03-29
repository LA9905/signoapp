from flask import Blueprint, request, jsonify
from app import db
from app.models.internal_consumption_model import InternalConsumption, InternalConsumptionProduct
from app.models.user_model import User
from app.models.product_model import Product
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func, cast, String
from app.utils.timezone import to_utc_naive, to_local, CL_TZ
from flask_cors import CORS

internal_bp = Blueprint("internal_consumptions", __name__)
CORS(internal_bp, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Crear consumo interno
@internal_bp.route("/internal-consumptions", methods=["POST"])
@jwt_required()
def create_internal_consumption():
    try:
        data = request.get_json() or {}
        if not data.get("nombre_retira") or not data.get("area") or not data.get("motivo"):
            return jsonify({"error": "Faltan campos requeridos (nombre_retira, area, motivo)"}), 400

        user_id = get_jwt_identity()
        nombre_retira = data["nombre_retira"]
        area = data["area"]
        motivo = data["motivo"]
        productos = data.get("productos", [])

        new_consumption = InternalConsumption(
            nombre_retira=nombre_retira,
            area=area,
            motivo=motivo,
            created_by=user_id,
        )
        new_consumption.fecha = to_utc_naive(datetime.now(CL_TZ))

        db.session.add(new_consumption)

        for p in productos:
            if not all(k in p for k in ("nombre", "cantidad", "unidad")):
                return jsonify({"error": "Faltan campos en productos (nombre, cantidad, unidad)"}), 400

            nombre = (p["nombre"] or "").strip()
            prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
            if not prod_row:
                db.session.add(Product(name=nombre, category="Otros", created_by=user_id, stock=0.0))
                db.session.flush()

            db.session.add(
                InternalConsumptionProduct(
                    nombre=nombre,
                    cantidad=p["cantidad"],
                    unidad=p["unidad"],
                    internal_consumption=new_consumption,
                )
            )

            prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
            if prod_row:
                try:
                    prod_row.stock = float(prod_row.stock or 0) - float(p["cantidad"] or 0)
                except Exception:
                    pass

        db.session.commit()
        return jsonify(new_consumption.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

# Listar consumos internos (con paginación y filtros)
@internal_bp.route("/internal-consumptions", methods=["GET"])
@jwt_required()
def get_internal_consumptions():
    try:
        search_nombre = (request.args.get("nombre_retira") or "").lower()
        search_area = (request.args.get("area") or "").lower()
        search_motivo = (request.args.get("motivo") or "").lower()
        search_user = (request.args.get("user") or "").lower()
        date_from_str = (request.args.get("date_from") or "").strip()
        date_to_str = (request.args.get("date_to") or "").strip()

        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 10))
        all_param = request.args.get("all")  #línea para soportar exportación de todos los datos

        query = InternalConsumption.query

        if search_nombre:
            query = query.filter(func.lower(InternalConsumption.nombre_retira).like(f"%{search_nombre}%"))

        if search_area:
            query = query.filter(func.lower(InternalConsumption.area).like(f"%{search_area}%"))

        if search_motivo:
            query = query.filter(func.lower(InternalConsumption.motivo).like(f"%{search_motivo}%"))

        if search_user:
            query = query.join(User, cast(User.id, String) == InternalConsumption.created_by).filter(
                func.lower(User.name).like(f"%{search_user}%")
            )

        if date_from_str:
            date_from = datetime.strptime(date_from_str, "%Y-%m-%d")
            query = query.filter(InternalConsumption.fecha >= to_utc_naive(date_from.replace(tzinfo=CL_TZ)))

        if date_to_str:
            date_to = datetime.strptime(date_to_str, "%Y-%m-%d")
            query = query.filter(InternalConsumption.fecha < to_utc_naive((date_to + timedelta(days=1)).replace(tzinfo=CL_TZ)))

        query = query.order_by(InternalConsumption.fecha.asc())

        # Aplicar paginación o fetching completo según parámetro 'all'
        if all_param:
            consumptions = query.all()
        else:
            consumptions = query.paginate(page=page, per_page=limit, error_out=False).items

        result = []
        for c in consumptions:
            creator = User.query.get(c.created_by)
            result.append({
                "id": c.id,
                "nombre_retira": c.nombre_retira,
                "area": c.area,
                "motivo": c.motivo,
                "created_by": creator.name if creator else c.created_by,
                "fecha": to_local(c.fecha).isoformat(timespec="seconds"),
                "productos": [
                    {"nombre": p.nombre, "cantidad": p.cantidad, "unidad": p.unidad} for p in c.productos
                ],
            })
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

# Detalle de consumo interno
@internal_bp.route("/internal-consumptions/<int:id>", methods=["GET"])
@jwt_required()
def get_internal_consumption_details(id):
    try:
        c = InternalConsumption.query.get_or_404(id)
        creator = User.query.get(c.created_by)
        return jsonify({
            "id": c.id,
            "nombre_retira": c.nombre_retira,
            "area": c.area,
            "motivo": c.motivo,
            "created_by": creator.name if creator else c.created_by,
            "fecha": to_local(c.fecha).isoformat(timespec="seconds"),
            "productos": [
                {"nombre": p.nombre, "cantidad": p.cantidad, "unidad": p.unidad} for p in c.productos
            ],
        }), 200
    except Exception as e:
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

# Actualizar consumo interno
@internal_bp.route("/internal-consumptions/<int:id>", methods=["PUT"])
@jwt_required()
def update_internal_consumption(id):
    try:
        c = InternalConsumption.query.get_or_404(id)
        data = request.get_json() or {}

        if "nombre_retira" in data and data["nombre_retira"]:
            c.nombre_retira = data["nombre_retira"]

        if "area" in data and data["area"]:
            c.area = data["area"]

        if "motivo" in data and data["motivo"]:
            c.motivo = data["motivo"]

        if "productos" in data and isinstance(data["productos"], list):
            # Lógica de deltas de stock similar a update_dispatch
            old_qty_by_name = {}
            for item in c.productos:
                q = float(item.cantidad or 0)
                old_qty_by_name[item.nombre] = old_qty_by_name.get(item.nombre, 0.0) + q

            new_rows = []
            new_qty_by_name = {}

            for p in data["productos"]:
                if not all(k in p for k in ("nombre", "cantidad", "unidad")):
                    return jsonify({"error": "Cada producto requiere nombre, cantidad y unidad"}), 400

                nombre = p["nombre"]
                cantidad = float(p["cantidad"] or 0)
                unidad = p["unidad"]

                new_rows.append(
                    InternalConsumptionProduct(internal_consumption_id=c.id, nombre=nombre, cantidad=cantidad, unidad=unidad)
                )
                new_qty_by_name[nombre] = new_qty_by_name.get(nombre, 0.0) + cantidad

            current_user = get_jwt_identity()
            for nombre in new_qty_by_name.keys():
                nn = (nombre or "").strip()
                exists = Product.query.filter(func.lower(Product.name) == nn.lower()).first()
                if not exists:
                    db.session.add(Product(name=nn, category="Otros", created_by=current_user, stock=0.0))

            all_names = set(old_qty_by_name.keys()) | set(new_qty_by_name.keys())
            for nombre in all_names:
                old_q = float(old_qty_by_name.get(nombre, 0.0))
                new_q = float(new_qty_by_name.get(nombre, 0.0))
                delta = new_q - old_q
                if delta != 0:
                    prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
                    if prod_row:
                        prod_row.stock = float(prod_row.stock or 0) - float(delta)

            InternalConsumptionProduct.query.filter_by(internal_consumption_id=c.id).delete()
            for row in new_rows:
                db.session.add(row)

        db.session.commit()

        creator = User.query.get(c.created_by)
        return jsonify({
            "id": c.id,
            "nombre_retira": c.nombre_retira,
            "area": c.area,
            "motivo": c.motivo,
            "created_by": creator.name if creator else c.created_by,
            "fecha": to_local(c.fecha).isoformat(timespec="seconds"),
            "productos": [
                {"nombre": p.nombre, "cantidad": p.cantidad, "unidad": p.unidad} for p in c.productos
            ],
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo actualizar el consumo interno", "details": str(e)}), 500

# Eliminar consumo interno
@internal_bp.route("/internal-consumptions/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_internal_consumption(id):
    try:
        c = InternalConsumption.query.get_or_404(id)

        for item in c.productos:
            nombre = (item.nombre or "").strip()
            prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
            if prod_row:
                prod_row.stock = float(prod_row.stock or 0) + float(item.cantidad or 0)

        InternalConsumptionProduct.query.filter_by(internal_consumption_id=c.id).delete()
        db.session.delete(c)
        db.session.commit()
        return jsonify({"message": "Consumo interno eliminado"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo eliminar el consumo interno", "details": str(e)}), 500