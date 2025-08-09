from flask import Blueprint, request, jsonify, current_app
from app.models.product_model import Product
from app import db
from flask_jwt_extended import jwt_required, get_jwt_identity, exceptions
from jwt import decode

product_bp = Blueprint('products', __name__)

@product_bp.route('/products', methods=['POST'])
@jwt_required()
def create_product():
    try:
        print("📥 Solicitud recibida:", request.get_data(as_text=True))
        print("Headers:", request.headers)
        token = request.headers.get('Authorization').replace('Bearer ', '')
        # Usar current_app para acceder a la configuración
        decoded_token = decode(token, key=current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        print("Token decodificado:", decoded_token)
        data = request.get_json()
        print("Datos JSON:", data)
        if not data:
            return jsonify({"error": "No se recibió un cuerpo JSON válido"}), 400
        name = data.get("name")
        category = data.get("category")
        user = get_jwt_identity()

        print(f"Validando: name={name}, category={category}, user={user}")

        if not name or not category:
            return jsonify({"error": "Los campos 'name' y 'category' son requeridos"}), 400

        existing = Product.query.filter_by(name=name, category=category).first()
        if existing:
            return jsonify({"error": "Ya existe un producto con ese nombre en esta categoría"}), 400

        new_product = Product(name=name, category=category, created_by=user)
        db.session.add(new_product)
        db.session.commit()

        return jsonify(new_product.to_dict()), 201
    except Exception as e:
        print(f"Error en create_product: {str(e)}")
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

        if not name or not category:
            return jsonify({"error": "Los campos 'name' y 'category' son requeridos"}), 400

        product = Product.query.get(product_id)
        if not product:
            return jsonify({"error": "Producto no encontrado"}), 404

        # Evitar duplicados (mismo nombre+categoría en otro ID)
        dup = Product.query.filter(
            Product.id != product_id,
            Product.name == name,
            Product.category == category
        ).first()
        if dup:
            return jsonify({"error": "Ya existe un producto con ese nombre en esta categoría"}), 400

        product.name = name
        product.category = category
        db.session.commit()
        return jsonify(product.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error actualizando producto", "details": str(e)}), 500


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