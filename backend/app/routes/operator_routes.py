from flask import Blueprint, request, jsonify
from app import db
from app.models.operator_model import Operator
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func

operator_bp = Blueprint('operators', __name__)

@operator_bp.route('/operators', methods=['GET'])
@jwt_required()
def list_operators():
    operators = Operator.query.all()
    return jsonify([operator.to_dict() for operator in operators]), 200

@operator_bp.route('/operators', methods=['POST'])
@jwt_required()
def create_operator():
    try:
        data = request.get_json() or {}
        name_raw = (data.get('name') or '').strip()
        if not name_raw:
            return jsonify({"error": "El campo 'name' es requerido"}), 400

        name_norm = " ".join(name_raw.split())

        exists = Operator.query.filter(func.lower(Operator.name) == name_norm.lower()).first()
        if exists:
            return jsonify({"error": "Ya existe un operario con ese nombre"}), 409

        user = get_jwt_identity()
        new_operator = Operator(name=name_norm, created_by=user)
        db.session.add(new_operator)
        db.session.commit()
        return jsonify(new_operator.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

@operator_bp.route('/operators/<int:operator_id>', methods=['PUT'])
@jwt_required()
def update_operator(operator_id):
    try:
        data = request.get_json() or {}
        name_raw = (data.get('name') or '').strip()
        if not name_raw:
            return jsonify({"error": "El campo 'name' es requerido"}), 400

        name_norm = " ".join(name_raw.split())

        operator = Operator.query.get_or_404(operator_id)

        dup = Operator.query.filter(
            Operator.id != operator_id,
            func.lower(Operator.name) == name_norm.lower()
        ).first()
        if dup:
            return jsonify({"error": "Ya existe un operario con ese nombre"}), 409

        operator.name = name_norm
        db.session.commit()
        return jsonify(operator.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo actualizar el operario", "details": str(e)}), 500

@operator_bp.route('/operators/<int:operator_id>', methods=['DELETE'])
@jwt_required()
def delete_operator(operator_id):
    try:
        operator = Operator.query.get_or_404(operator_id)
        db.session.delete(operator)
        db.session.commit()
        return jsonify({"message": "Operario eliminado"}), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "No se puede eliminar el operario porque está referenciado por otros registros"}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo eliminar el operario", "details": str(e)}), 500