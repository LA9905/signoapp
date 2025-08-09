from flask import Blueprint, request, jsonify
from app import db
from app.models.driver_model import Driver
from app.models.dispatch_model import Dispatch  # ← para verificar referencias
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError

driver_bp = Blueprint('drivers', __name__)

@driver_bp.route('/drivers', methods=['GET'])
@jwt_required()
def list_drivers():
    # Opcional: ordenar por nombre
    drivers = Driver.query.order_by(Driver.name.asc()).all()
    return jsonify([driver.to_dict() for driver in drivers]), 200

@driver_bp.route('/drivers', methods=['POST'])
@jwt_required()
def create_driver():
    try:
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({"error": "El campo 'name' es requerido"}), 400

        name = data.get("name").strip()
        if not name:
            return jsonify({"error": "El nombre no puede ser vacío"}), 400

        user = get_jwt_identity()
        new_driver = Driver(name=name, created_by=user)
        db.session.add(new_driver)
        db.session.commit()

        return jsonify(new_driver.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

@driver_bp.route('/drivers/<int:driver_id>', methods=['PUT'])
@jwt_required()
def update_driver(driver_id):
    try:
        data = request.get_json() or {}
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({"error": "El campo 'name' es requerido"}), 400

        driver = Driver.query.get_or_404(driver_id)
        driver.name = name
        db.session.commit()
        return jsonify(driver.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

@driver_bp.route('/drivers/<int:driver_id>', methods=['DELETE'])
@jwt_required()
def delete_driver(driver_id):
    try:
        driver = Driver.query.get_or_404(driver_id)

        # ✅ Verificar si el chofer tiene despachos asociados
        has_dispatch = db.session.query(Dispatch.id).filter(Dispatch.chofer_id == driver_id).first()
        if has_dispatch:
            return jsonify({
                "error": "No se puede eliminar el chofer porque tiene despachos asociados."
            }), 409  # Conflicto: está referenciado

        db.session.delete(driver)
        db.session.commit()
        return jsonify({"message": "Chofer eliminado correctamente"}), 200

    except IntegrityError as e:
        db.session.rollback()
        # fallback si falló por integridad referencial
        return jsonify({
            "error": "No se puede eliminar el chofer porque está referenciado por otros registros."
        }), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500