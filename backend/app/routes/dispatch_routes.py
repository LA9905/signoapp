from flask import Blueprint, request, jsonify
from app import db
from app.models.dispatch_model import Dispatch, DispatchProduct
from app.models.client_model import Client
from app.models.driver_model import Driver
from flask_jwt_extended import jwt_required, get_jwt_identity

dispatch_bp = Blueprint('dispatches', __name__)

@dispatch_bp.route('/dispatches', methods=['POST'])
@jwt_required()
def create_dispatch():
    try:
        data = request.get_json()
        print("Datos recibidos en /api/dispatches:", data)  # Depuración
        if not data or 'orden' not in data or not data.get('cliente') or not data.get('chofer'):
            return jsonify({"error": "Faltan campos requeridos (orden, cliente, chofer)"}), 400

        user = get_jwt_identity()
        orden = data.get('orden')
        cliente_name = data.get('cliente')
        chofer_id = data.get('chofer')
        productos = data.get('productos', [])

        # Verificar o registrar cliente
        cliente = Client.query.filter_by(name=cliente_name).first()
        if not cliente:
            cliente = Client(name=cliente_name, created_by=user)
            db.session.add(cliente)
            db.session.flush()  # Para obtener el ID antes de commit

        # Verificar chofer
        chofer = Driver.query.get(chofer_id)
        if not chofer:
            return jsonify({"error": f"Chofer con ID {chofer_id} no encontrado"}), 404

        # Crear despacho
        new_dispatch = Dispatch(
            orden=orden,
            chofer_id=chofer_id,
            cliente_id=cliente.id,
            created_by=user
        )
        db.session.add(new_dispatch)

        # Agregar productos
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
        print(f"Error en create_dispatch: {str(e)}")  # Depuración
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

@dispatch_bp.route('/dispatches/monthly', methods=['GET'])
@jwt_required()
def get_monthly_dispatches():
    try:
        from datetime import datetime
        today = datetime.utcnow()
        start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        data_points = [0] * 31

        dispatches = Dispatch.query.filter(Dispatch.fecha >= start_of_month).all()
        for dispatch in dispatches:
            day = dispatch.fecha.day - 1
            if day < 31:
                data_points[day] += 1

        return jsonify(data_points), 200
    except Exception as e:
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500