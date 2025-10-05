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

production_bp = Blueprint("productions", __name__)
CORS(
    production_bp,
    resources={r"/*": {"origins": "*"}},
    supports_credentials=True,
)

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
            created_by=user_id,
        )
        new_production.fecha = to_utc_naive(datetime.now(CL_TZ))

        db.session.add(new_production)

        for p in productos:
            if not all(k in p for k in ("nombre", "cantidad", "unidad")):
                return jsonify({"error": "Faltan campos en productos (nombre, cantidad, unidad)"}), 400

            nombre = (p["nombre"] or "").strip()
            prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
            if not prod_row:
                db.session.add(Product(name=nombre, category="Otros", created_by=user_id, stock=0.0))
                db.session.flush()

            db.session.add(
                ProductionProduct(
                    nombre=nombre,
                    cantidad=p["cantidad"],
                    unidad=p["unidad"],
                    production=new_production,
                )
            )

            prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
            if prod_row:
                try:
                    prod_row.stock = float(prod_row.stock or 0) + float(p["cantidad"] or 0)
                except Exception:
                    pass

        db.session.commit()
        return jsonify(new_production.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

@production_bp.route("/productions", methods=["GET"])
@jwt_required()
def get_productions():
    try:
        search_operator = (request.args.get("operator") or "").lower()
        search_user = (request.args.get("user") or "").lower()
        date_from_str = (request.args.get("date_from") or "").strip()
        date_to_str = (request.args.get("date_to") or "").strip()
        
        # Paginación
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 10))

        query = Production.query

        if search_operator:
            query = query.join(Operator).filter(db.func.lower(Operator.name).like(f"%{search_operator}%"))

        if search_user:
            query = query.join(User, User.id == Production.created_by).filter(
                db.func.lower(User.name).like(f"%{search_user}%")
            )

        if date_from_str and date_to_str:
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

        # Aplicar paginación
        productions = query.paginate(page=page, per_page=limit, error_out=False).items

        result = []
        for p in productions:
            operator = Operator.query.get(p.operator_id)
            creator = User.query.get(p.created_by)
            result.append(
                {
                    "id": p.id,
                    "operator": operator.name if operator else str(p.operator_id),
                    "created_by": creator.name if creator else p.created_by,
                    "fecha": to_local(p.fecha).isoformat(timespec="seconds"),
                    "productos": [
                        {"nombre": pr.nombre, "cantidad": pr.cantidad, "unidad": pr.unidad} for pr in p.productos
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
                    if prod_row.stock < 0:
                        prod_row.stock = 0  # Evitar stock negativo
                except Exception:
                    pass  # Manejo básico, podrías loguear esto

        # Eliminar los productos de la producción
        for product in production.productos:
            db.session.delete(product)

        # Eliminar la producción
        db.session.delete(production)
        db.session.commit()

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
            prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
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
                    if prod_row.stock < 0:
                        prod_row.stock = 0

        # Agregar nuevos productos a la production
        for p in data["productos"]:
            nombre = (p["nombre"] or "").strip()
            db.session.add(
                ProductionProduct(
                    nombre=nombre,
                    cantidad=p["cantidad"],
                    unidad=p["unidad"],
                    production=production,
                )
            )

        db.session.commit()
        return jsonify(production.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo actualizar la producción", "details": str(e)}), 500