from flask import Blueprint, request, jsonify
from app import db
from app.models.dispatch_model import Dispatch, DispatchProduct
from app.models.client_model import Client
from app.models.driver_model import Driver
from app.models.user_model import User
from app.models.product_model import Product
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from sqlalchemy import cast, String
from app.utils.timezone import (
    to_local,
    month_start_local_now,
    to_utc_naive,
    CL_TZ,
)

# CORS para este blueprint
from flask_cors import CORS, cross_origin

dispatch_bp = Blueprint("dispatches", __name__)
CORS(
    dispatch_bp,
    resources={r"/*": {"origins": "*"}},
    supports_credentials=True,
)

# ----------------------------
# Crear despacho
# ----------------------------
@dispatch_bp.route("/dispatches", methods=["POST"])
@jwt_required()
def create_dispatch():
    try:
        data = request.get_json() or {}
        if not data.get("orden") or not data.get("cliente") or not data.get("chofer"):
            return jsonify({"error": "Faltan campos requeridos (orden, cliente, chofer)"}), 400

        user_id = get_jwt_identity()
        orden = data["orden"]
        cliente_name = data["cliente"]
        chofer_id = int(data["chofer"])
        productos = data.get("productos", [])
        paquete_numero = data.get("paquete_numero")  # opcional int

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
            created_by=user_id,
            paquete_numero=paquete_numero,
        )
        # Guardamos UTC naive (desde hora local CL)
        new_dispatch.fecha = to_utc_naive(datetime.now(CL_TZ))

        db.session.add(new_dispatch)

        # Items y rebaja de stock por nombre (si existe)
        for p in productos:
            if not all(k in p for k in ("nombre", "cantidad", "unidad")):
                return jsonify({"error": "Faltan campos en productos (nombre, cantidad, unidad)"}), 400

            db.session.add(
                DispatchProduct(
                    nombre=p["nombre"],
                    cantidad=p["cantidad"],
                    unidad=p["unidad"],
                    dispatch=new_dispatch,
                )
            )

            prod_row = Product.query.filter_by(name=p["nombre"]).first()
            if prod_row:
                try:
                    prod_row.stock = float(prod_row.stock or 0) - float(p["cantidad"] or 0)
                except Exception:
                    # si falla el casteo, no tocamos stock
                    pass

        db.session.commit()
        return jsonify(new_dispatch.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500


# ----------------------------
# Listar despachos (filtros)
# ----------------------------
@dispatch_bp.route("/dispatches", methods=["GET"])
@jwt_required()
def get_dispatches():
    try:
        search_client = (request.args.get("client") or "").lower()
        search_order = (request.args.get("order") or "").lower()
        search_user = (request.args.get("user") or "").lower()
        search_driver = (request.args.get("driver") or "").lower()
        search_date = request.args.get("date") or ""
        search_invoice = (request.args.get("invoice") or "").lower()

        query = Dispatch.query

        if search_client:
            query = query.join(Client).filter(db.func.lower(Client.name).like(f"%{search_client}%"))
        if search_order:
            query = query.filter(db.func.lower(Dispatch.orden).like(f"%{search_order}%"))
        if search_user:
            query = query.join(User, cast(User.id, String) == Dispatch.created_by).filter(
                db.func.lower(User.name).like(f"%{search_user}%")
            )
        if search_driver:
            query = query.join(Driver).filter(db.func.lower(Driver.name).like(f"%{search_driver}%"))
        if search_invoice:
            query = query.filter(db.func.lower(Dispatch.factura_numero).like(f"%{search_invoice}%"))
        if search_date:
            try:
                d = datetime.strptime(search_date, "%Y-%m-%d")
                start_local = d.replace(tzinfo=CL_TZ)
                end_local = start_local.replace(hour=23, minute=59, second=59, microsecond=999999)
                start_utc_naive = to_utc_naive(start_local)
                end_utc_naive = to_utc_naive(end_local)
                query = query.filter(Dispatch.fecha >= start_utc_naive, Dispatch.fecha <= end_utc_naive)
            except ValueError:
                return jsonify({"error": "Formato de fecha inválido, use YYYY-MM-DD"}), 400

        dispatches = query.all()
        result = []
        for d in dispatches:
            client = Client.query.get(d.cliente_id)
            driver = Driver.query.get(d.chofer_id)
            creator = User.query.get(d.created_by)
            derived_status = (
                "entregado_cliente"
                if d.delivered_client
                else "entregado_chofer"
                if d.delivered_driver
                else (d.status or "pendiente")
            )
            result.append(
                {
                    "id": d.id,
                    "orden": d.orden,
                    "cliente": client.name if client else str(d.cliente_id),
                    "chofer": driver.name if driver else str(d.chofer_id),
                    "created_by": creator.name if creator else d.created_by,
                    "fecha": to_local(d.fecha).isoformat(timespec="seconds"),
                    "status": derived_status,
                    "delivered_driver": d.delivered_driver,
                    "delivered_client": d.delivered_client,
                    "paquete_numero": d.paquete_numero,
                    "factura_numero": d.factura_numero,
                    "productos": [
                        {"nombre": p.nombre, "cantidad": p.cantidad, "unidad": p.unidad} for p in d.productos
                    ],
                }
            )
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500


# ----------------------------
# Detalle de despacho
# ----------------------------
@dispatch_bp.route("/dispatches/<int:dispatch_id>", methods=["GET"])
@jwt_required()
def get_dispatch_details(dispatch_id):
    try:
        d = Dispatch.query.get_or_404(dispatch_id)
        client = Client.query.get(d.cliente_id)
        driver = Driver.query.get(d.chofer_id)
        creator = User.query.get(d.created_by)
        derived_status = (
            "entregado_cliente"
            if d.delivered_client
            else "entregado_chofer"
            if d.delivered_driver
            else (d.status or "pendiente")
        )
        return jsonify(
            {
                "id": d.id,
                "orden": d.orden,
                "cliente": client.name if client else str(d.cliente_id),
                "chofer": driver.name if driver else str(d.chofer_id),
                "created_by": creator.name if creator else d.created_by,
                "fecha": to_local(d.fecha).isoformat(timespec="seconds"),
                "status": derived_status,
                "delivered_driver": d.delivered_driver,
                "delivered_client": d.delivered_client,
                "paquete_numero": d.paquete_numero,
                "factura_numero": d.factura_numero,
                "productos": [
                    {"nombre": p.nombre, "cantidad": p.cantidad, "unidad": p.unidad} for p in d.productos
                ],
            }
        ), 200
    except Exception as e:
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500


# ----------------------------
# Actualizar despacho
# ----------------------------
@dispatch_bp.route("/dispatches/<int:dispatch_id>", methods=["PUT"])
@jwt_required()
def update_dispatch(dispatch_id):
    try:
        d = Dispatch.query.get_or_404(dispatch_id)
        data = request.get_json() or {}

        if "orden" in data and data["orden"]:
            d.orden = data["orden"]

        if "cliente" in data and data["cliente"]:
            cliente_name = data["cliente"]
            cliente = Client.query.filter_by(name=cliente_name).first()
            if not cliente:
                current_user = get_jwt_identity()
                cliente = Client(name=cliente_name, created_by=current_user)
                db.session.add(cliente)
                db.session.flush()
            d.cliente_id = cliente.id

        if "chofer" in data and data["chofer"]:
            chofer_id = int(data["chofer"])
            chofer = Driver.query.get(chofer_id)
            if not chofer:
                return jsonify({"error": f"Chofer con ID {chofer_id} no encontrado"}), 404
            d.chofer_id = chofer_id

        # Nuevos: paquete y factura
        if "paquete_numero" in data:
            d.paquete_numero = data.get("paquete_numero") or None

        if "factura_numero" in data:
            d.factura_numero = (data.get("factura_numero") or "").strip() or None

        # Estados con protección
        if "status" in data and data["status"]:
            new_status = data["status"]
            if d.delivered_client:
                pass
            else:
                if new_status == "entregado_cliente":
                    d.delivered_client = True
                    d.delivered_client_at = datetime.utcnow()
                    d.status = "entregado_cliente"
                    if not d.delivered_driver:
                        d.delivered_driver = True
                        d.delivered_driver_at = datetime.utcnow()
                elif new_status == "entregado_chofer":
                    if not d.delivered_driver:
                        d.delivered_driver = True
                        d.delivered_driver_at = datetime.utcnow()
                        d.status = "entregado_chofer"
                elif new_status in ("pendiente", "cancelado"):
                    if not d.delivered_driver and not d.delivered_client:
                        d.status = new_status

        if "fecha" in data and data["fecha"]:
            try:
                local_dt = datetime.fromisoformat(data["fecha"])
                d.fecha = to_utc_naive(local_dt)
            except Exception:
                pass

        if "productos" in data and isinstance(data["productos"], list):
            DispatchProduct.query.filter_by(dispatch_id=d.id).delete()
            for p in data["productos"]:
                if not all(k in p for k in ("nombre", "cantidad", "unidad")):
                    db.session.rollback()
                    return jsonify({"error": "Cada producto requiere nombre, cantidad y unidad"}), 400
                db.session.add(
                    DispatchProduct(dispatch_id=d.id, nombre=p["nombre"], cantidad=p["cantidad"], unidad=p["unidad"])
                )

        db.session.commit()

        client = Client.query.get(d.cliente_id)
        driver = Driver.query.get(d.chofer_id)
        creator = User.query.get(d.created_by)
        derived_status = (
            "entregado_cliente"
            if d.delivered_client
            else "entregado_chofer"
            if d.delivered_driver
            else (d.status or "pendiente")
        )
        return jsonify(
            {
                "id": d.id,
                "orden": d.orden,
                "cliente": client.name if client else str(d.cliente_id),
                "chofer": driver.name if driver else str(d.chofer_id),
                "created_by": creator.name if creator else d.created_by,
                "fecha": to_local(d.fecha).isoformat(timespec="seconds"),
                "status": derived_status,
                "delivered_driver": d.delivered_driver,
                "delivered_client": d.delivered_client,
                "paquete_numero": d.paquete_numero,
                "factura_numero": d.factura_numero,
                "productos": [
                    {"nombre": p.nombre, "cantidad": p.cantidad, "unidad": p.unidad} for p in d.productos
                ],
            }
        ), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo actualizar el despacho", "details": str(e)}), 500


# ----------------------------
# Gráfico: despachos del mes (usuario actual)
# ----------------------------
@dispatch_bp.route("/dispatches/monthly", methods=["GET"])
@jwt_required()
def get_monthly_dispatches():
    try:
        start_local = month_start_local_now()
        start_utc_naive = to_utc_naive(start_local)

        data_points = [0] * 31

        # created_by es String en el modelo
        current_user_id = str(get_jwt_identity())

        dispatches = Dispatch.query.filter(
            Dispatch.created_by == current_user_id, Dispatch.fecha >= start_utc_naive
        ).all()

        for d in dispatches:
            local_dt = to_local(d.fecha)
            day_idx = local_dt.day - 1
            if 0 <= day_idx < 31:
                data_points[day_idx] += 1

        return jsonify(data_points), 200
    except Exception as e:
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500


# ----------------------------
# Estados: entregado a chofer
# (con soporte a preflight OPTIONS)
# ----------------------------
@dispatch_bp.route("/dispatches/<int:dispatch_id>/mark-driver", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
@jwt_required(optional=True)  # permite OPTIONS sin JWT; POST seguirá trayendo el JWT del cliente
def mark_driver_delivered(dispatch_id):
    if request.method == "OPTIONS":
        # Preflight
        return ("", 204)

    try:
        d = Dispatch.query.get_or_404(dispatch_id)
        if d.delivered_client:
            return jsonify({"error": "Ya fue entregado a cliente; no se puede modificar."}), 400
        if not d.delivered_driver:
            d.delivered_driver = True
            d.delivered_driver_at = datetime.utcnow()
            d.status = "entregado_chofer"
        db.session.commit()
        return jsonify(d.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error al marcar entregado a chofer", "details": str(e)}), 500


# ----------------------------
# Estados: entregado a cliente
# (con soporte a preflight OPTIONS)
# ----------------------------
@dispatch_bp.route("/dispatches/<int:dispatch_id>/mark-client", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
@jwt_required(optional=True)
def mark_client_delivered(dispatch_id):
    if request.method == "OPTIONS":
        # Preflight
        return ("", 204)

    try:
        d = Dispatch.query.get_or_404(dispatch_id)
        if not d.delivered_client:
            d.delivered_client = True
            d.delivered_client_at = datetime.utcnow()
            d.status = "entregado_cliente"
            if not d.delivered_driver:
                d.delivered_driver = True
                d.delivered_driver_at = datetime.utcnow()
        db.session.commit()
        return jsonify(d.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error al marcar entregado a cliente", "details": str(e)}), 500
    
# ----------------------------
# Eliminar despacho (con preflight)
# ----------------------------

@dispatch_bp.route("/dispatches/<int:dispatch_id>", methods=["DELETE", "OPTIONS"])
@cross_origin(supports_credentials=True)   # permite el preflight desde el front
@jwt_required(optional=True)               # OPTIONS sin JWT; validamos JWT en el DELETE
def delete_dispatch(dispatch_id):
    # Preflight
    if request.method == "OPTIONS":
        return ("", 204)

    # Requiere JWT para el DELETE real
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401

    try:
        d = Dispatch.query.get_or_404(dispatch_id)

        # Borrar items asociados primero
        DispatchProduct.query.filter_by(dispatch_id=d.id).delete()

        # Luego el despacho
        db.session.delete(d)
        db.session.commit()
        return jsonify({"message": "Despacho eliminado"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo eliminar el despacho", "details": str(e)}), 500