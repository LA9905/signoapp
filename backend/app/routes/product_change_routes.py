from flask import Blueprint, request, jsonify
from app import db
from app.models.product_change_model import ProductChange, ProductChangeItem
from app.models.user_model import User
from app.models.product_model import Product
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func, cast, String
from app.utils.timezone import to_utc_naive, to_local, CL_TZ
from flask_cors import CORS
from app.routes.product_routes import normalize_product_name, normalize_search, normalize_db_column

product_change_bp = Blueprint("product_changes", __name__)
CORS(product_change_bp, resources={r"/*": {"origins": "*"}}, supports_credentials=True)


def _apply_stock_delta(nombre, cantidad, tipo, sign=1):
    """sign=1 aplica el movimiento normal, sign=-1 lo revierte (para editar/eliminar)."""
    prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
    if not prod_row:
        return
    factor = 1 if tipo == "entra" else -1
    try:
        prod_row.stock = float(prod_row.stock or 0) + (sign * factor * float(cantidad or 0))
    except Exception:
        pass


# Crear cambio de producto
@product_change_bp.route("/product-changes", methods=["POST"])
@jwt_required()
def create_product_change():
    try:
        data = request.get_json() or {}
        if not data.get("nombre_persona"):
            return jsonify({"error": "Falta el nombre de quien trae/se lleva el producto"}), 400

        productos = data.get("productos", [])
        if not productos:
            return jsonify({"error": "Debes agregar al menos un producto"}), 400

        user_id = get_jwt_identity()

        fecha_str = (data.get("fecha") or "").strip()
        now_local = datetime.now(CL_TZ)
        if fecha_str:
            try:
                chosen_date = datetime.strptime(fecha_str, "%Y-%m-%d").date()
            except ValueError:
                return jsonify({"error": "Formato de fecha inválido, use YYYY-MM-DD"}), 400
            local_dt = datetime.combine(chosen_date, now_local.timetz())
        else:
            local_dt = now_local

        new_change = ProductChange(
            nombre_persona=data["nombre_persona"],
            cliente=(data.get("cliente") or "").strip() or None,
            orden_compra=(data.get("orden_compra") or "").strip() or None,
            factura=(data.get("factura") or "").strip() or None,
            comentario=(data.get("comentario") or "").strip() or None,
            created_by=user_id,
        )
        new_change.fecha = to_utc_naive(local_dt)
        db.session.add(new_change)

        for p in productos:
            if not all(k in p for k in ("nombre", "cantidad", "unidad", "tipo")):
                return jsonify({"error": "Cada producto requiere nombre, cantidad, unidad y tipo"}), 400
            if p["tipo"] not in ("entra", "sale"):
                return jsonify({"error": "El tipo de producto debe ser 'entra' o 'sale'"}), 400

            nombre = (p["nombre"] or "").strip()
            nombre_key = normalize_product_name(nombre)
            prod_row = next((pr for pr in Product.query.all() if normalize_product_name(pr.name) == nombre_key), None)
            if not prod_row:
                db.session.add(Product(name=nombre, category="Otros", created_by=user_id, stock=0.0))
                db.session.flush()

            db.session.add(
                ProductChangeItem(
                    nombre=nombre,
                    cantidad=p["cantidad"],
                    unidad=p["unidad"],
                    tipo=p["tipo"],
                    product_change=new_change,
                )
            )
            _apply_stock_delta(nombre, p["cantidad"], p["tipo"], sign=1)

        db.session.commit()
        return jsonify(new_change.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500


# Listar cambios de producto (con paginación y filtros)
@product_change_bp.route("/product-changes", methods=["GET"])
@jwt_required()
def get_product_changes():
    try:
        search_persona = normalize_search(request.args.get("nombre_persona") or "")
        search_cliente = normalize_search(request.args.get("cliente") or "")
        search_user = normalize_search(request.args.get("user") or "")
        search_product = normalize_search(request.args.get("product") or "")
        date_from_str = (request.args.get("date_from") or "").strip()
        date_to_str = (request.args.get("date_to") or "").strip()

        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 10))
        all_param = request.args.get("all")

        query = ProductChange.query

        if search_persona:
            query = query.filter(normalize_db_column(ProductChange.nombre_persona).like(f"%{search_persona}%"))

        if search_cliente:
            query = query.filter(normalize_db_column(ProductChange.cliente).like(f"%{search_cliente}%"))

        if search_user:
            query = query.join(User, cast(User.id, String) == ProductChange.created_by).filter(
                normalize_db_column(User.name).like(f"%{search_user}%")
            )

        if search_product:
            query = query.join(ProductChangeItem, ProductChangeItem.product_change_id == ProductChange.id).filter(
                normalize_db_column(ProductChangeItem.nombre).like(f"%{search_product}%")
            ).distinct()

        if date_from_str:
            date_from = datetime.strptime(date_from_str, "%Y-%m-%d")
            query = query.filter(ProductChange.fecha >= to_utc_naive(date_from.replace(tzinfo=CL_TZ)))
            if not date_to_str:
                query = query.filter(ProductChange.fecha < to_utc_naive((date_from + timedelta(days=1)).replace(tzinfo=CL_TZ)))

        if date_to_str:
            date_to = datetime.strptime(date_to_str, "%Y-%m-%d")
            query = query.filter(ProductChange.fecha < to_utc_naive((date_to + timedelta(days=1)).replace(tzinfo=CL_TZ)))

        query = query.order_by(ProductChange.fecha.asc())

        if all_param:
            changes = query.all()
        else:
            changes = query.paginate(page=page, per_page=limit, error_out=False).items

        result = []
        for c in changes:
            creator = User.query.get(c.created_by)
            result.append({
                "id": c.id,
                "nombre_persona": c.nombre_persona,
                "cliente": c.cliente,
                "orden_compra": c.orden_compra,
                "factura": c.factura,
                "comentario": c.comentario,
                "created_by": creator.name if creator else c.created_by,
                "fecha": to_local(c.fecha).isoformat(timespec="seconds"),
                "productos": [
                    {"nombre": p.nombre, "cantidad": p.cantidad, "unidad": p.unidad, "tipo": p.tipo}
                    for p in c.productos
                ],
            })
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500


# Detalle
@product_change_bp.route("/product-changes/<int:id>", methods=["GET"])
@jwt_required()
def get_product_change_detail(id):
    try:
        c = ProductChange.query.get_or_404(id)
        creator = User.query.get(c.created_by)
        return jsonify({
            "id": c.id,
            "nombre_persona": c.nombre_persona,
            "cliente": c.cliente,
            "orden_compra": c.orden_compra,
            "factura": c.factura,
            "comentario": c.comentario,
            "created_by": creator.name if creator else c.created_by,
            "fecha": to_local(c.fecha).isoformat(timespec="seconds"),
            "productos": [
                {"nombre": p.nombre, "cantidad": p.cantidad, "unidad": p.unidad, "tipo": p.tipo}
                for p in c.productos
            ],
        }), 200
    except Exception as e:
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500


# Actualizar
@product_change_bp.route("/product-changes/<int:id>", methods=["PUT"])
@jwt_required()
def update_product_change(id):
    try:
        c = ProductChange.query.get_or_404(id)
        data = request.get_json() or {}

        if "nombre_persona" in data and data["nombre_persona"]:
            c.nombre_persona = data["nombre_persona"]
        if "cliente" in data:
            c.cliente = (data.get("cliente") or "").strip() or None
        if "orden_compra" in data:
            c.orden_compra = (data.get("orden_compra") or "").strip() or None
        if "factura" in data:
            c.factura = (data.get("factura") or "").strip() or None
        if "comentario" in data:
            c.comentario = (data.get("comentario") or "").strip() or None

        if "fecha" in data and data.get("fecha"):
            try:
                chosen_date = datetime.strptime(data["fecha"], "%Y-%m-%d").date()
            except ValueError:
                return jsonify({"error": "Formato de fecha inválido, use YYYY-MM-DD"}), 400
            hora_actual = to_local(c.fecha).timetz()
            c.fecha = to_utc_naive(datetime.combine(chosen_date, hora_actual))

        if "productos" in data and isinstance(data["productos"], list):
            # Revertir el efecto de stock de los productos actuales
            for item in c.productos:
                _apply_stock_delta(item.nombre, item.cantidad, item.tipo, sign=-1)

            current_user = get_jwt_identity()
            new_rows = []
            for p in data["productos"]:
                if not all(k in p for k in ("nombre", "cantidad", "unidad", "tipo")):
                    return jsonify({"error": "Cada producto requiere nombre, cantidad, unidad y tipo"}), 400
                if p["tipo"] not in ("entra", "sale"):
                    return jsonify({"error": "El tipo de producto debe ser 'entra' o 'sale'"}), 400

                nombre = (p["nombre"] or "").strip()
                nombre_key = normalize_product_name(nombre)
                exists = next((pr for pr in Product.query.all() if normalize_product_name(pr.name) == nombre_key), None)
                if not exists:
                    db.session.add(Product(name=nombre, category="Otros", created_by=current_user, stock=0.0))
                    db.session.flush()

                new_rows.append(
                    ProductChangeItem(
                        product_change_id=c.id,
                        nombre=nombre,
                        cantidad=float(p["cantidad"] or 0),
                        unidad=p["unidad"],
                        tipo=p["tipo"],
                    )
                )

            ProductChangeItem.query.filter_by(product_change_id=c.id).delete()
            for row in new_rows:
                db.session.add(row)
                _apply_stock_delta(row.nombre, row.cantidad, row.tipo, sign=1)

        db.session.commit()

        creator = User.query.get(c.created_by)
        return jsonify({
            "id": c.id,
            "nombre_persona": c.nombre_persona,
            "cliente": c.cliente,
            "orden_compra": c.orden_compra,
            "factura": c.factura,
            "comentario": c.comentario,
            "created_by": creator.name if creator else c.created_by,
            "fecha": to_local(c.fecha).isoformat(timespec="seconds"),
            "productos": [
                {"nombre": p.nombre, "cantidad": p.cantidad, "unidad": p.unidad, "tipo": p.tipo}
                for p in c.productos
            ],
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo actualizar el registro", "details": str(e)}), 500


# Eliminar
@product_change_bp.route("/product-changes/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_product_change(id):
    try:
        c = ProductChange.query.get_or_404(id)

        for item in c.productos:
            _apply_stock_delta(item.nombre, item.cantidad, item.tipo, sign=-1)

        ProductChangeItem.query.filter_by(product_change_id=c.id).delete()
        db.session.delete(c)
        db.session.commit()
        return jsonify({"message": "Registro eliminado"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo eliminar el registro", "details": str(e)}), 500