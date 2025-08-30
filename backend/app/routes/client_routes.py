from flask import Blueprint, request, jsonify
from app import db
from app.models.client_model import Client
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func

client_bp = Blueprint('clients', __name__)

@client_bp.route('/clients', methods=['GET'])
@jwt_required()
def list_clients():
    clients = Client.query.all()
    return jsonify([client.to_dict() for client in clients]), 200

@client_bp.route('/clients', methods=['POST'])
@jwt_required()
def create_client():
    try:
        data = request.get_json() or {}
        name_raw = (data.get('name') or '').strip()
        if not name_raw:
            return jsonify({"error": "El campo 'name' es requerido"}), 400

        # normaliza (case-insensitive, sin dobles espacios)
        name_norm = " ".join(name_raw.split())

        # existe ya (case-insensitive)?
        exists = Client.query.filter(func.lower(Client.name) == name_norm.lower()).first()
        if exists:
            return jsonify({"error": "Ya existe un centro de costo con ese nombre"}), 409

        user = get_jwt_identity()
        new_client = Client(name=name_norm, created_by=user)
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
        name_raw = (data.get('name') or '').strip()
        if not name_raw:
            return jsonify({"error": "El campo 'name' es requerido"}), 400

        name_norm = " ".join(name_raw.split())

        client = Client.query.get_or_404(client_id)

        # evita duplicado con otros (case-insensitive)
        dup = Client.query.filter(
            Client.id != client_id,
            func.lower(Client.name) == name_norm.lower()
        ).first()
        if dup:
            return jsonify({"error": "Ya existe un centro de costo con ese nombre"}), 409

        client.name = name_norm
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
    except IntegrityError:
        db.session.rollback()
        # FK (despachos) referencian a este cliente
        return jsonify({"error": "No se puede eliminar el cliente porque está referenciado por otros registros"}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo eliminar el cliente", "details": str(e)}), 500