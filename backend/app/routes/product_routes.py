from flask import Blueprint, request, jsonify, current_app
from app.models.product_model import Product
from app import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from jwt import decode

product_bp = Blueprint('products', __name__)

@product_bp.route('/products', methods=['POST'])
@jwt_required()
def create_product():
    try:
        token = request.headers.get('Authorization').replace('Bearer ', '')
        decode(token, key=current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        data = request.get_json()
        if not data:
            return jsonify({"error": "No se recibió un cuerpo JSON válido"}), 400
        name = data.get("name")
        category = data.get("category")
        stock = float(data.get("stock") or 0)  # NUEVO (opcional)
        user = get_jwt_identity()

        if not name or not category:
            return jsonify({"error": "Los campos 'name' y 'category' son requeridos"}), 400

        existing = Product.query.filter_by(name=name, category=category).first()
        if existing:
            return jsonify({"error": "Ya existe un producto con ese nombre en esta categoría"}), 400

        new_product = Product(name=name, category=category, created_by=user, stock=stock)
        db.session.add(new_product)
        db.session.commit()

        return jsonify(new_product.to_dict()), 201
    except Exception as e:
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
            Product.name == name,
            Product.category == category
        ).first()
        if dup:
            return jsonify({"error": "Ya existe un producto con ese nombre en esta categoría"}), 400

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