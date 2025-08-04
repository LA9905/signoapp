# app/routes/product_routes.py
from flask import Blueprint, request, jsonify
from app.models.product_model import Product
from app import db
from flask_jwt_extended import jwt_required, get_jwt_identity, exceptions

product_bp = Blueprint('products', __name__)

@product_bp.route('/products', methods=['POST'])
@jwt_required()
def create_product():
    try:
        print("Headers:", request.headers)
        print("JSON recibido:", request.get_json())  # Intentar parsear JSON
        print("📦 Ruta /api/products alcanzada")
        print("Body recibido:", request.get_data(as_text=True))  # Datos crudos

        data = request.get_json()  # Usar get_json() explícitamente
        if not data:
            return jsonify({"error": "No se recibió un cuerpo JSON válido"}), 400
        name = data.get("name")
        category = data.get("category")
        user = get_jwt_identity()

        if not name or not category:
            return jsonify({"error": "Los campos 'name' y 'category' son requeridos"}), 400

        existing = Product.query.filter_by(name=name, category=category).first()
        if existing:
            return jsonify({"error": "Ya existe un producto con ese nombre en esta categoría"}), 400

        new_product = Product(name=name, category=category, created_by=user)
        db.session.add(new_product)
        db.session.commit()

        return jsonify(new_product.to_dict()), 201
    except exceptions.JWTError as e:
        print(f"Error JWT: {str(e)}")
        return jsonify({"error": "Error de autenticación", "details": str(e)}), 401
    except ValueError as e:
        print(f"Error al parsear JSON: {str(e)}")
        return jsonify({"error": "Datos JSON inválidos", "details": str(e)}), 400
    except Exception as e:
        print(f"Error en create_product: {str(e)}")
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

@product_bp.route('/products', methods=['GET'])
@jwt_required()
def list_products():
    products = Product.query.all()
    return jsonify([p.to_dict() for p in products]), 200