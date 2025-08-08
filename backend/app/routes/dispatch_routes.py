from flask import Blueprint, request, jsonify
from app import db
from app.models.dispatch_model import Dispatch, DispatchProduct
from app.models.client_model import Client
from app.models.driver_model import Driver
from app.models.user_model import User
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

dispatch_bp = Blueprint('dispatches', __name__)

@dispatch_bp.route('/dispatches', methods=['POST'])
@jwt_required()
def create_dispatch():
    try:
        data = request.get_json()
        print("Datos recibidos en /api/dispatches:", data)
        if not data or 'orden' not in data or not data.get('cliente') or not data.get('chofer'):
            return jsonify({"error": "Faltan campos requeridos (orden, cliente, chofer)"}), 400

        user_id = get_jwt_identity()  # ID del usuario
        orden = data.get('orden')
        cliente_name = data.get('cliente')
        chofer_id = data.get('chofer')
        productos = data.get('productos', [])

        cliente = Client.query.filter_by(name=cliente_name).first()
        if not cliente:
            cliente = Client(name=cliente_name, created_by=user_id)
            db.session.add(cliente)
            db.session.flush()

        chofer = Driver.query.get(chofer_id)
        if not chofer:
            return jsonify({"error": f"Chofer con ID {chofer_id} no encontrado"}), 404

        new_dispatch = Dispatch(
            orden=orden,
            chofer_id=chofer_id,
            cliente_id=cliente.id,
            created_by=user_id
        )
        db.session.add(new_dispatch)

        for producto in productos:
            if 'nombre' not in producto or 'cantidad' not in producto or 'unidad' not in producto:
                return jsonify({"error": "Faltan campos en productos (nombre, cantidad, unidad)"}), 400
            new_product = DispatchProduct(
                nombre=producto['nombre'],
                cantidad=producto['cantidad'],
                unidad=producto['unidad'],
                dispatch=new_dispatch
            )
            db.session.add(new_product)

        db.session.commit()
        return jsonify(new_dispatch.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error en create_dispatch: {str(e)}")
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

@dispatch_bp.route('/dispatches', methods=['GET'])
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
            query = query.join(User, Dispatch.created_by == User.id).filter(db.func.lower(User.name).like(f'%{search_user}%'))
        if search_driver:
            query = query.join(Driver).filter(db.func.lower(Driver.name).like(f'%{search_driver}%'))
        if search_date:
            try:
                date_obj = datetime.strptime(search_date, '%Y-%m-%d')
                query = query.filter(db.func.date(Dispatch.fecha) == date_obj.date())
            except ValueError:
                return jsonify({"error": "Formato de fecha inválido, use YYYY-MM-DD"}), 400

        dispatches = query.all()
        result = [{
            'id': d.id,
            'orden': d.orden,
            'cliente': Client.query.get(d.cliente_id).name,
            'chofer': Driver.query.get(d.chofer_id).name,
            'created_by': User.query.get(d.created_by).name if User.query.get(d.created_by) else d.created_by,
            'fecha': d.fecha.isoformat(),
            'status': d.status,
            'productos': [{'nombre': p.nombre, 'cantidad': p.cantidad, 'unidad': p.unidad} for p in d.productos]
        } for d in dispatches]

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

@dispatch_bp.route('/dispatches/<int:dispatch_id>', methods=['GET'])
@jwt_required()
def get_dispatch_details(dispatch_id):
    try:
        dispatch = Dispatch.query.get_or_404(dispatch_id)
        client = Client.query.get(dispatch.cliente_id)
        driver = Driver.query.get(dispatch.chofer_id)
        creator = User.query.get(dispatch.created_by)

        result = {
            'id': dispatch.id,
            'orden': dispatch.orden,
            'cliente': client.name,
            'chofer': driver.name,
            'created_by': creator.name if creator else dispatch.created_by,
            'fecha': dispatch.fecha.isoformat(),
            'status': dispatch.status,
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

@dispatch_bp.route('/dispatches/<int:dispatch_id>/mark-delivered', methods=['POST'])
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

@dispatch_bp.route('/dispatches/monthly', methods=['GET'])
@jwt_required()
def get_monthly_dispatches():
    try:
        from datetime import datetime
        today = datetime.utcnow()
        start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        data_points = [0] * 31

        # Filtrar solo los despachos creados por el usuario actual
        current_user_id = get_jwt_identity()
        dispatches = Dispatch.query.filter(Dispatch.created_by == current_user_id, Dispatch.fecha >= start_of_month).all()
        for dispatch in dispatches:
            day = dispatch.fecha.day - 1
            if day < 31:
                data_points[day] += 1

        return jsonify(data_points), 200
    except Exception as e:
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500