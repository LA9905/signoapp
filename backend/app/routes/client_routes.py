from flask import Blueprint, request, jsonify
from app import db
from app.models.client_model import Client
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError

client_bp = Blueprint('clients', __name__)

@client_bp.route('/clients', methods=['GET'])
@jwt_required()
def list_clients():
    print("📥 Solicitud GET recibida en /api/clients")
    print("Headers:", request.headers)
    clients = Client.query.all()
    return jsonify([client.to_dict() for client in clients]), 200

@client_bp.route('/clients', methods=['POST'])
@jwt_required()
def create_client():
    try:
        print("📥 Solicitud POST recibida en /api/clients")
        print("Headers:", request.headers)
        print("Datos JSON:", request.get_json())
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({"error": "El campo 'name' es requerido"}), 400

        name = data.get("name").strip()
        if not name:
            return jsonify({"error": "El nombre no puede estar vacío"}), 400

        user = get_jwt_identity()

        new_client = Client(name=name, created_by=user)
        db.session.add(new_client)
        db.session.commit()

        return jsonify(new_client.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

@client_bp.route('/clients/<int:client_id>', methods=['PUT'])
@jwt_required()
def update_client(client_id):
    try:
        data = request.get_json() or {}
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({"error": "El campo 'name' es requerido"}), 400

        client = Client.query.get_or_404(client_id)
        client.name = name
        db.session.commit()
        return jsonify(client.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo actualizar el cliente", "details": str(e)}), 500

@client_bp.route('/clients/<int:client_id>', methods=['DELETE'])
@jwt_required()
def delete_client(client_id):
    try:
        client = Client.query.get_or_404(client_id)
        db.session.delete(client)
        db.session.commit()
        return jsonify({"message": "Cliente eliminado"}), 200
    except IntegrityError as ie:
        db.session.rollback()
        # Esto suele ocurrir si hay FK (despachos) apuntando a este cliente
        return jsonify({"error": "No se puede eliminar el cliente porque está referenciado por otros registros"}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo eliminar el cliente", "details": str(e)}), 500