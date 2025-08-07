from flask import Blueprint, request, jsonify
from app import db
from app.models.dispatch_model import Dispatch, DispatchProduct
from app.models.client_model import Client
from app.models.driver_model import Driver
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

tracking_bp = Blueprint('tracking', __name__)

@tracking_bp.route('/dispatches', methods=['GET'])
@jwt_required()
def get_dispatches():
    try:
        search_client = request.args.get('client', '').lower()
        search_order = request.args.get('order', '').lower()
        search_user = request.args.get('user', '').lower()
        search_driver = request.args.get('driver', '').lower()
        search_date = request.args.get('date', '')

        query = Dispatch.query

        if search_client:
            query = query.join(Client).filter(db.func.lower(Client.name).like(f'%{search_client}%'))
        if search_order:
            query = query.filter(db.func.lower(Dispatch.orden).like(f'%{search_order}%'))
        if search_user:
            query = query.filter(db.func.lower(Dispatch.created_by).like(f'%{search_user}%'))
        if search_driver:
            query = query.join(Driver).filter(db.func.lower(Driver.name).like(f'%{search_driver}%'))
        if search_date:
            try:
                date_obj = datetime.strptime(search_date, '%Y-%m-%d')
                query = query.filter(db.func.date(Dispatch.fecha) == date_obj.date())
            except ValueError:
                return jsonify({"error": "Formato de fecha inválido, use YYYY-MM-DD"}), 400

        dispaches = query.all()
        result = [{
            'id': d.id,
            'orden': d.orden,
            'cliente': Client.query.get(d.cliente_id).name,
            'chofer': Driver.query.get(d.chofer_id).name,
            'created_by': d.created_by,
            'fecha': d.fecha.isoformat(),
            'status': d.status,  # Incluir el estado
            'producto_count': len(d.productos)
        } for d in dispaches]

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

@tracking_bp.route('/dispatches/<int:dispatch_id>', methods=['GET'])
@jwt_required()
def get_dispatch_details(dispatch_id):
    try:
        dispatch = Dispatch.query.get_or_404(dispatch_id)
        client = Client.query.get(dispatch.cliente_id)
        driver = Driver.query.get(dispatch.chofer_id)

        result = {
            'id': dispatch.id,
            'orden': dispatch.orden,
            'cliente': client.name,
            'chofer': driver.name,
            'created_by': dispatch.created_by,
            'fecha': dispatch.fecha.isoformat(),
            'status': dispatch.status,  # Incluir el estado
            'productos': [
                {
                    'nombre': p.nombre,
                    'cantidad': p.cantidad,
                    'unidad': p.unidad
                } for p in dispatch.productos
            ]
        }
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

@tracking_bp.route('/dispatches/<int:dispatch_id>/mark-delivered', methods=['POST'])
@jwt_required()
def mark_dispatch_delivered(dispatch_id):
    try:
        dispatch = Dispatch.query.get_or_404(dispatch_id)
        dispatch.status = 'entregado'
        db.session.commit()
        return jsonify({"message": "Despacho marcado como entregado", "status": dispatch.status}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error al marcar como entregado", "details": str(e)}), 500