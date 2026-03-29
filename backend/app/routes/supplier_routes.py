from flask import Blueprint, request, jsonify
from app import db
from app.models.supplier_model import Supplier
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func

supplier_bp = Blueprint('suppliers', __name__)

@supplier_bp.route('/suppliers', methods=['GET'])
@jwt_required()
def list_suppliers():
    suppliers = Supplier.query.all()
    return jsonify([supplier.to_dict() for supplier in suppliers]), 200

@supplier_bp.route('/suppliers', methods=['POST'])
@jwt_required()
def create_supplier():
    try:
        data = request.get_json() or {}
        name_raw = (data.get('name') or '').strip()
        if not name_raw:
            return jsonify({"error": "El campo 'name' es requerido"}), 400

        name_norm = " ".join(name_raw.split())

        exists = Supplier.query.filter(func.lower(Supplier.name) == name_norm.lower()).first()
        if exists:
            return jsonify({"error": "Ya existe un proveedor con ese nombre"}), 409

        user = get_jwt_identity()
        new_supplier = Supplier(name=name_norm, created_by=user)
        db.session.add(new_supplier)
        db.session.commit()
        return jsonify(new_supplier.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

@supplier_bp.route('/suppliers/<int:supplier_id>', methods=['PUT'])
@jwt_required()
def update_supplier(supplier_id):
    try:
        data = request.get_json() or {}
        name_raw = (data.get('name') or '').strip()
        if not name_raw:
            return jsonify({"error": "El campo 'name' es requerido"}), 400

        name_norm = " ".join(name_raw.split())

        supplier = Supplier.query.get_or_404(supplier_id)

        dup = Supplier.query.filter(
            Supplier.id != supplier_id,
            func.lower(Supplier.name) == name_norm.lower()
        ).first()
        if dup:
            return jsonify({"error": "Ya existe un proveedor con ese nombre"}), 409

        supplier.name = name_norm
        db.session.commit()
        return jsonify(supplier.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo actualizar el proveedor", "details": str(e)}), 500

@supplier_bp.route('/suppliers/<int:supplier_id>', methods=['DELETE'])
@jwt_required()
def delete_supplier(supplier_id):
    try:
        supplier = Supplier.query.get_or_404(supplier_id)
        db.session.delete(supplier)
        db.session.commit()
        return jsonify({"message": "Proveedor eliminado"}), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "No se puede eliminar el proveedor porque está referenciado por otros registros"}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo eliminar el proveedor", "details": str(e)}), 500