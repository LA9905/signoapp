from flask import Blueprint, request, jsonify, current_app
from app import db
from app.models.dispatch_model import Dispatch, DispatchProduct, DispatchImage
from app.models.client_model import Client
from app.models.driver_model import Driver
from app.models.user_model import User
from app.models.product_model import Product
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import cast, String, func, exists
import traceback
from app.utils.timezone import (
    to_local,
    month_start_local_now,
    to_utc_naive,
    CL_TZ,
)

import cloudinary 
import cloudinary.uploader
import json 

# === FUNCIÓN AUXILIAR PARA OBTENER public_id DE CLOUDINARY ===
def get_public_id(url):
    try:
        parts = url.split('/')
        if len(parts) > 7:
            folder = parts[-2]
            filename = parts[-1].split('.')[0]
            return f"{folder}/{filename}"
    except Exception:
        pass
    return None

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
    user_id = get_jwt_identity()
    current_user = User.query.get(user_id)
    limited_emails = [
        "claudiogarbarino1966@gmail.com",
        "alfonsomachado64@gmail.com",
        "jerrykalet@gmail.com",
        "cocachaucono@gmail.com"
    ]
    if current_user.email.lower() in [email.lower() for email in limited_emails]:
        return jsonify({"error": "No autorizado para crear despachos"}), 403

    try:
        if not request.form.get('data'):
            return jsonify({"error": "Faltan datos"}), 400
        data = json.loads(request.form['data'])

        if not data.get("orden") or not data.get("cliente") or not data.get("chofer"):
            return jsonify({"error": "Faltan campos requeridos (orden, cliente, chofer)"}), 400

        user_id = get_jwt_identity()
        orden = data["orden"]
        cliente_name_input = data["cliente"]
        chofer_id = int(data["chofer"])
        productos = data.get("productos", [])
        paquete_numero = (data.get("paquete_numero") or "").strip() or None
        factura_numero = (data.get("factura_numero") or "").strip() or None
        force = data.get("force", False)

        cliente_norm = " ".join((cliente_name_input or "").strip().split())
        cliente = Client.query.filter(func.lower(Client.name) == cliente_norm.lower()).first()
        if not cliente:
            cliente = Client(name=cliente_norm, created_by=user_id)
            db.session.add(cliente)
            db.session.flush()

        chofer = Driver.query.get(chofer_id)
        if not chofer:
            return jsonify({"error": f"Chofer con ID {chofer_id} no encontrado"}), 404

        existing = Dispatch.query.filter_by(orden=orden).first()
        if existing and not force:
            return jsonify({"error": "duplicate_order", "msg": "Ya existe un despacho con ese número de orden. Confirme para continuar."}), 409

        # CORRECCIÓN: Se usa client_name (sin doble 'c')
        new_dispatch = Dispatch(
            orden=orden,
            chofer_id=chofer_id,
            cliente_id=cliente.id,
            created_by=user_id,
            paquete_numero=paquete_numero,
            factura_numero=factura_numero,
            chofer_name=chofer.name,
            client_name=cliente.name, 
        )
        new_dispatch.fecha = to_utc_naive(datetime.now(CL_TZ))

        db.session.add(new_dispatch)
        db.session.flush()

        for p in productos:
            if not all(k in p for k in ("nombre", "cantidad", "unidad")):
                return jsonify({"error": "Faltan campos en productos"}), 400

            nombre = (p["nombre"] or "").strip()
            prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
            if not prod_row:
                db.session.add(Product(name=nombre, category="Otros", created_by=user_id, stock=0.0))
                db.session.flush()

            db.session.add(
                DispatchProduct(
                    nombre=nombre,
                    cantidad=p["cantidad"],
                    unidad=p["unidad"],
                    dispatch_id=new_dispatch.id,
                )
            )

            prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
            if prod_row:
                prod_row.stock = float(prod_row.stock or 0) - float(p["cantidad"] or 0)

        images = request.files.getlist('images')
        for img in images:
            if img:
                upload_result = cloudinary.uploader.upload(img, folder="dispatches")
                new_image = DispatchImage(
                    dispatch_id=new_dispatch.id,
                    image_url=upload_result['secure_url']
                )
                db.session.add(new_image)

        db.session.commit()
        return jsonify(new_dispatch.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        print(traceback.format_exc())
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
        search_invoice = (request.args.get("invoice") or "").lower()
        search_product = (request.args.get("product") or "").lower()
        
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 10))
        all_param = request.args.get("all")
        
        date_from_str = (request.args.get("date_from") or "").strip()
        date_to_str = (request.args.get("date_to") or "").strip()
        date_single_str = (request.args.get("date") or "").strip()

        query = Dispatch.query

        if search_client:
            query = query.filter(db.func.lower(Dispatch.client_name).like(f"%{search_client}%"))

        if search_order:
            query = query.filter(db.func.lower(Dispatch.orden).like(f"%{search_order}%"))

        if search_user:
            query = query.join(User, cast(User.id, String) == Dispatch.created_by).filter(
                db.func.lower(User.name).like(f"%{search_user}%")
            )

        if search_driver:
            query = query.filter(db.func.lower(Dispatch.chofer_name).like(f"%{search_driver}%"))

        if search_invoice:
            query = query.filter(db.func.lower(Dispatch.factura_numero).like(f"%{search_invoice}%"))

        if search_product:
            subq = exists().where(
                DispatchProduct.dispatch_id == Dispatch.id,
                db.func.lower(DispatchProduct.nombre).like(f"%{search_product}%")
            )
            query = query.filter(subq)

        apply_local_window_check = False
        win_start_local = None
        win_end_local = None

        def _day_bounds_local_aware(day_str: str):
            d = datetime.strptime(day_str, "%Y-%m-%d")
            start_local = d.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=CL_TZ)
            end_local_exclusive = (d + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=CL_TZ)
            return start_local, end_local_exclusive

        def _normalize_range_local(start_local_aware: datetime, end_local_exclusive_aware: datetime):
            a_start = to_utc_naive(start_local_aware)
            a_end = to_utc_naive(end_local_exclusive_aware)
            b_start = start_local_aware.replace(tzinfo=None)
            b_end = end_local_exclusive_aware.replace(tzinfo=None)
            return a_start, a_end, b_start, b_end

        if date_from_str:
            date_to_str = date_to_str or date_from_str  # Si no hay "hasta", asumir igual a "desde"
            try:
                d_from = datetime.strptime(date_from_str, "%Y-%m-%d")
                d_to = datetime.strptime(date_to_str, "%Y-%m-%d")
                if d_from > d_to: d_from, d_to = d_to, d_from
                win_start_local = d_from.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=CL_TZ)
                win_end_local = (d_to + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=CL_TZ)
                apply_local_window_check = True
                a_start, a_end, b_start, b_end = _normalize_range_local(win_start_local, win_end_local)
                query = query.filter(Dispatch.fecha >= min(a_start, b_start), Dispatch.fecha < max(a_end, b_end))
            except ValueError:
                return jsonify({"error": "Formato de fecha inválido"}), 400

        elif date_single_str:
            try:
                win_start_local, win_end_local = _day_bounds_local_aware(date_single_str)
                apply_local_window_check = True
                a_start, a_end, b_start, b_end = _normalize_range_local(win_start_local, win_end_local)
                query = query.filter(Dispatch.fecha >= min(a_start, b_start), Dispatch.fecha < max(a_end, b_end))
            except ValueError:
                return jsonify({"error": "Formato de fecha inválido"}), 400

        query = query.order_by(Dispatch.fecha.asc())

        if all_param:
            dispatches = query.all()
        else:
            dispatches = query.paginate(page=page, per_page=limit, error_out=False).items

        if apply_local_window_check:
            dispatches = [d for d in dispatches if win_start_local <= to_local(d.fecha) < win_end_local]

        result = []
        for d in dispatches:
            client = Client.query.get(d.cliente_id)
            creator = User.query.get(d.created_by)
            derived_status = "entregado_cliente" if d.delivered_client else "entregado_chofer" if d.delivered_driver else (d.status or "pendiente")
            result.append({
                "id": d.id,
                "orden": d.orden,
                "cliente": client.name if client else d.client_name, # CORRECCIÓN: client_name
                "chofer": d.chofer_name,
                "created_by": creator.name if creator else d.created_by,
                "fecha": to_local(d.fecha).isoformat(timespec="seconds"),
                "status": derived_status,
                "delivered_driver": d.delivered_driver,
                "delivered_client": d.delivered_client,
                "paquete_numero": d.paquete_numero,
                "factura_numero": d.factura_numero,
                "productos": [{"nombre": p.nombre, "cantidad": p.cantidad, "unidad": p.unidad} for p in d.productos],
                "images": [i.to_dict() for i in d.images],
            })
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
        creator = User.query.get(d.created_by)
        derived_status = "entregado_cliente" if d.delivered_client else "entregado_chofer" if d.delivered_driver else (d.status or "pendiente")
        return jsonify({
            "id": d.id,
            "orden": d.orden,
            "cliente": client.name if client else d.client_name, # CORRECCIÓN: client_name
            "chofer": d.chofer_name,
            "created_by": creator.name if creator else d.created_by,
            "fecha": to_local(d.fecha).isoformat(timespec="seconds"),
            "status": derived_status,
            "delivered_driver": d.delivered_driver,
            "delivered_client": d.delivered_client,
            "paquete_numero": d.paquete_numero,
            "factura_numero": d.factura_numero,
            "productos": [{"nombre": p.nombre, "cantidad": p.cantidad, "unidad": p.unidad} for p in d.productos],
            "images": [i.to_dict() for i in d.images],
        }), 200
    except Exception as e:
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

# ----------------------------
# Actualizar despacho
# ----------------------------
@dispatch_bp.route("/dispatches/<int:dispatch_id>", methods=["PUT"])
@jwt_required()
def update_dispatch(dispatch_id):
    user_id = get_jwt_identity()
    current_user = User.query.get(user_id)
    limited_emails = ["claudiogarbarino1966@gmail.com", "alfonsomachado64@gmail.com", "jerrykalet@gmail.com", "cocachaucono@gmail.com"]
    if current_user.email.lower() in [email.lower() for email in limited_emails]:
        return jsonify({"error": "No autorizado para editar despachos"}), 403

    try:
        d = Dispatch.query.get_or_404(dispatch_id)
        if not request.form.get('data'):
            return jsonify({"error": "Faltan datos"}), 400
        data = json.loads(request.form['data'])

        if "orden" in data and data["orden"]:
            d.orden = data["orden"]

        if "cliente" in data and data["cliente"]:
            cliente_norm = " ".join((data["cliente"] or "").strip().split())
            cliente = Client.query.filter(func.lower(Client.name) == cliente_norm.lower()).first()
            if not cliente:
                cliente = Client(name=cliente_norm, created_by=user_id)
                db.session.add(cliente)
                db.session.flush()
            d.cliente_id = cliente.id
            d.client_name = cliente.name # CORRECCIÓN: client_name

        if "chofer" in data and data["chofer"]:
            chofer = Driver.query.get(int(data["chofer"]))
            if chofer:
                d.chofer_id = chofer.id
                d.chofer_name = chofer.name

        if "paquete_numero" in data: d.paquete_numero = data.get("paquete_numero") or None
        if "factura_numero" in data: d.factura_numero = (data.get("factura_numero") or "").strip() or None

        if "status" in data and data["status"]:
            new_status = data["status"]
            if not d.delivered_client:
                if new_status == "entregado_cliente":
                    d.delivered_client = True
                    d.delivered_client_at = datetime.utcnow()
                    d.status = "entregado_cliente"
                    d.delivered_driver = True
                    d.delivered_driver_at = datetime.utcnow()
                elif new_status == "entregado_chofer":
                    d.delivered_driver = True
                    d.delivered_driver_at = datetime.utcnow()
                    d.status = "entregado_chofer"
                elif new_status in ("pendiente", "cancelado"):
                    d.status = new_status

        if "productos" in data and isinstance(data["productos"], list):
            old_qty = {item.nombre: float(item.cantidad or 0) for item in d.productos}
            DispatchProduct.query.filter_by(dispatch_id=d.id).delete()
            
            new_qty = {}
            for p in data["productos"]:
                nombre, cant, unid = p["nombre"], float(p["cantidad"] or 0), p["unidad"]
                db.session.add(DispatchProduct(dispatch_id=d.id, nombre=nombre, cantidad=cant, unidad=unid))
                new_qty[nombre] = new_qty.get(nombre, 0.0) + cant
                
                prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
                if not prod_row:
                    db.session.add(Product(name=nombre, category="Otros", created_by=user_id, stock=0.0))

            for nombre in (set(old_qty.keys()) | set(new_qty.keys())):
                delta = new_qty.get(nombre, 0.0) - old_qty.get(nombre, 0.0)
                prod = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
                if prod: prod.stock = float(prod.stock or 0) - delta

        delete_image_ids = data.get("delete_image_ids", [])
        for img_id in delete_image_ids:
            img = DispatchImage.query.get(img_id)
            if img:
                p_id = get_public_id(img.image_url)
                if p_id: cloudinary.uploader.destroy(p_id)
                db.session.delete(img)

        new_imgs = request.files.getlist('new_images')
        for img in new_imgs:
            if img:
                res = cloudinary.uploader.upload(img, folder="dispatches")
                db.session.add(DispatchImage(dispatch_id=d.id, image_url=res['secure_url']))

        db.session.commit()
        
        client = Client.query.get(d.cliente_id)
        creator = User.query.get(d.created_by)
        return jsonify({
            "id": d.id,
            "orden": d.orden,
            "cliente": client.name if client else d.client_name, # CORRECCIÓN: client_name
            "chofer": d.chofer_name,
            "created_by": creator.name if creator else d.created_by,
            "fecha": to_local(d.fecha).isoformat(timespec="seconds"),
            "status": d.status,
            "productos": [{"nombre": p.nombre, "cantidad": p.cantidad, "unidad": p.unidad} for p in d.productos],
            "images": [i.to_dict() for i in d.images],
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error al actualizar", "details": str(e)}), 500

# ----------------------------
# Los demás endpoints (Monthly, Mark, Delete) permanecen lógicamente igual
# ----------------------------
@dispatch_bp.route("/dispatches/monthly", methods=["GET"])
@jwt_required()
def get_monthly_dispatches():
    try:
        year = request.args.get("year")
        month = request.args.get("month")
        start_local = datetime(int(year), int(month), 1, tzinfo=CL_TZ) if year and month else month_start_local_now()
        start_utc = to_utc_naive(start_local)
        end_local = (start_local.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(seconds=1)
        end_utc = to_utc_naive(end_local)

        data_points = [0] * 31
        current_user_id = str(get_jwt_identity())
        dispatches = Dispatch.query.filter(Dispatch.created_by == current_user_id, Dispatch.fecha >= start_utc, Dispatch.fecha <= end_utc).all()

        for d in dispatches:
            day_idx = to_local(d.fecha).day - 1
            if 0 <= day_idx < 31: data_points[day_idx] += 1
        return jsonify(data_points), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@dispatch_bp.route("/dispatches/<int:dispatch_id>/mark-driver", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
@jwt_required(optional=True)
def mark_driver_delivered(dispatch_id):
    if request.method == "OPTIONS": return ("", 204)
    try:
        d = Dispatch.query.get_or_404(dispatch_id)
        if not d.delivered_driver:
            d.delivered_driver = True
            d.delivered_driver_at = datetime.utcnow()
            d.status = "entregado_chofer"
            db.session.commit()
        return jsonify(d.to_dict()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@dispatch_bp.route("/dispatches/<int:dispatch_id>/mark-client", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
@jwt_required(optional=True)
def mark_client_delivered(dispatch_id):
    if request.method == "OPTIONS": return ("", 204)
    try:
        d = Dispatch.query.get_or_404(dispatch_id)
        d.delivered_client = True
        d.delivered_client_at = datetime.utcnow()
        d.status = "entregado_cliente"
        d.delivered_driver = True
        d.delivered_driver_at = datetime.utcnow()
        db.session.commit()
        return jsonify(d.to_dict()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@dispatch_bp.route("/dispatches/<int:dispatch_id>", methods=["DELETE", "OPTIONS"])
@cross_origin(supports_credentials=True)
@jwt_required(optional=True)
def delete_dispatch(dispatch_id):
    if request.method == "OPTIONS": return ("", 204)
    user_id = get_jwt_identity()
    if not user_id: return jsonify({"error": "No autorizado"}), 401
    try:
        d = Dispatch.query.get_or_404(dispatch_id)
        for img in d.images:
            p_id = get_public_id(img.image_url)
            if p_id: cloudinary.uploader.destroy(p_id)
        for item in d.productos:
            prod = Product.query.filter(func.lower(Product.name) == item.nombre.lower()).first()
            if prod: prod.stock = float(prod.stock or 0) + float(item.cantidad or 0)
        DispatchProduct.query.filter_by(dispatch_id=d.id).delete()
        db.session.delete(d)
        db.session.commit()
        return jsonify({"message": "Despacho eliminado"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo eliminar el despacho", "details": str(e)}), 500