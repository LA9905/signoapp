from flask import Blueprint, request, jsonify, current_app
from app.models.product_model import Product
from app import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from jwt import decode
from sqlalchemy import func

product_bp = Blueprint('products', __name__)

@product_bp.route('/products', methods=['POST'])
@jwt_required()
def create_product():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No se recibió un cuerpo JSON válido"}), 400

        name_raw = (data.get("name") or "").strip()
        category = (data.get("category") or "").strip() or "Otros"
        user = get_jwt_identity()
        stock = float(data.get("stock") or 0)

        if not name_raw:
            return jsonify({"error": "El campo 'name' es requerido"}), 400

        # Normalizamos nombre para comparar case-insensitive
        name_norm = " ".join(name_raw.split())
        exists = Product.query.filter(func.lower(Product.name) == name_norm.lower()).first()
        if exists:
            return jsonify({"error": "Ya existe un producto con ese nombre"}), 409

        new_product = Product(name=name_norm, category=category, created_by=user, stock=stock)
        db.session.add(new_product)
        db.session.commit()
        return jsonify(new_product.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500


@product_bp.route('/products', methods=['GET'])
@jwt_required()
def list_products():
    products = Product.query.all()
    return jsonify([p.to_dict() for p in products]), 200


@product_bp.route('/products/<int:product_id>', methods=['PUT', 'PATCH'])
@jwt_required()
def update_product(product_id):
    try:
        data = request.get_json() or {}
        name = data.get("name")
        category = data.get("category")
        stock = data.get("stock")  # opcional

        if not name or not category:
            return jsonify({"error": "Los campos 'name' y 'category' son requeridos"}), 400

        product = Product.query.get(product_id)
        if not product:
            return jsonify({"error": "Producto no encontrado"}), 404

        dup = Product.query.filter(
            Product.id != product_id,
            func.lower(Product.name) == (name or "").strip().lower()
        ).first()
        if dup:
            return jsonify({"error": "Ya existe un producto con ese nombre"}), 409

        product.name = name
        product.category = category
        if stock is not None:
            try:
                product.stock = float(stock)
            except Exception:
                pass

        db.session.commit()
        return jsonify(product.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error actualizando producto", "details": str(e)}), 500


@product_bp.route('/products/<int:product_id>/stock', methods=['PATCH'])
@jwt_required()
def adjust_stock(product_id):
    """
    Body JSON:
    { "delta": -5 }  -> suma/resta al stock
    ó { "set": 120 } -> setea a un valor exacto
    """
    try:
        data = request.get_json() or {}
        product = Product.query.get(product_id)
        if not product:
            return jsonify({"error": "Producto no encontrado"}), 404

        if "set" in data:
            product.stock = float(data["set"])
        elif "delta" in data:
            product.stock = float(product.stock or 0) + float(data["delta"])
        else:
            return jsonify({"error": "Se requiere 'delta' o 'set'"}), 400

        db.session.commit()
        return jsonify(product.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error ajustando stock", "details": str(e)}), 500


@product_bp.route('/products/<int:product_id>', methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    try:
        product = Product.query.get(product_id)
        if not product:
            return jsonify({"error": "Producto no encontrado"}), 404

        db.session.delete(product)
        db.session.commit()
        return jsonify({"message": "Producto eliminado"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error eliminando producto", "details": str(e)}), 500