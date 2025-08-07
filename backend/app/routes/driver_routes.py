from flask import Blueprint, request, jsonify
from app import db
from app.models.driver_model import Driver
from flask_jwt_extended import jwt_required, get_jwt_identity

driver_bp = Blueprint('drivers', __name__)

@driver_bp.route('/drivers', methods=['GET'])
@jwt_required()
def list_drivers():
    drivers = Driver.query.all()
    return jsonify([driver.to_dict() for driver in drivers]), 200

@driver_bp.route('/drivers', methods=['POST'])
@jwt_required()
def create_driver():
    try:
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({"error": "El campo 'name' es requerido"}), 400

        name = data.get("name")
        user = get_jwt_identity()

        new_driver = Driver(name=name, created_by=user)
        db.session.add(new_driver)
        db.session.commit()

        return jsonify(new_driver.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500