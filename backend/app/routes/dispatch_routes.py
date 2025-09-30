from flask import Blueprint, request, jsonify
from app import db
from app.models.dispatch_model import Dispatch, DispatchProduct
from app.models.client_model import Client
from app.models.driver_model import Driver
from app.models.user_model import User
from app.models.product_model import Product
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import cast, String, func
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

        cliente_norm = " ".join((cliente_name or "").strip().split())
        cliente = Client.query.filter(func.lower(Client.name) == cliente_norm.lower()).first()
        if not cliente:
            cliente = Client(name=cliente_norm, created_by=user_id)
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

            # Fallback: si el producto NO existe, créalo (sin duplicar por nombre, case-insensitive)
            nombre = (p["nombre"] or "").strip()
            prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
            if not prod_row:
                db.session.add(Product(name=nombre, category="Otros", created_by=user_id, stock=0.0))
                db.session.flush()

            # Item del despacho
            db.session.add(
                DispatchProduct(
                    nombre=nombre,
                    cantidad=p["cantidad"],
                    unidad=p["unidad"],
                    dispatch=new_dispatch,
                )
            )

            # Ajuste de stock (case-insensitive)
            prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
            if prod_row:
                try:
                    prod_row.stock = float(prod_row.stock or 0) - float(p["cantidad"] or 0)
                except Exception:
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
        search_invoice = (request.args.get("invoice") or "").lower()
        
        # Paginación
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 10))
        
        date_from_str = (request.args.get("date_from") or "").strip()
        date_to_str = (request.args.get("date_to") or "").strip()
        date_single_str = (request.args.get("date") or "").strip()

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

        # Filtro de fecha robusto (sin cambios)
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

        if date_from_str and date_to_str:
            try:
                d_from = datetime.strptime(date_from_str, "%Y-%m-%d")
                d_to = datetime.strptime(date_to_str, "%Y-%m-%d")
            except ValueError:
                return jsonify({"error": "Formato de fecha inválido en date_from/date_to, use YYYY-MM-DD"}), 400

            if d_from > d_to:
                d_from, d_to = d_to, d_from

            win_start_local = d_from.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=CL_TZ)
            win_end_local = (d_to + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=CL_TZ)
            apply_local_window_check = True

            a_start, a_end, b_start, b_end = _normalize_range_local(win_start_local, win_end_local)
            sql_start = min(a_start, b_start)
            sql_end = max(a_end, b_end)
            query = query.filter(Dispatch.fecha >= sql_start, Dispatch.fecha < sql_end)

        elif date_from_str and not date_to_str:
            try:
                win_start_local, win_end_local = _day_bounds_local_aware(date_from_str)
            except ValueError:
                return jsonify({"error": "Formato de fecha inválido en date_from, use YYYY-MM-DD"}), 400
            apply_local_window_check = True
            a_start, a_end, b_start, b_end = _normalize_range_local(win_start_local, win_end_local)
            sql_start = min(a_start, b_start)
            sql_end = max(a_end, b_end)
            query = query.filter(Dispatch.fecha >= sql_start, Dispatch.fecha < sql_end)

        elif date_to_str and not date_from_str:
            try:
                win_start_local, win_end_local = _day_bounds_local_aware(date_to_str)
            except ValueError:
                return jsonify({"error": "Formato de fecha inválido en date_to, use YYYY-MM-DD"}), 400
            apply_local_window_check = True
            a_start, a_end, b_start, b_end = _normalize_range_local(win_start_local, win_end_local)
            sql_start = min(a_start, b_start)
            sql_end = max(a_end, b_end)
            query = query.filter(Dispatch.fecha >= sql_start, Dispatch.fecha < sql_end)

        elif date_single_str:
            try:
                win_start_local, win_end_local = _day_bounds_local_aware(date_single_str)
            except ValueError:
                return jsonify({"error": "Formato de fecha inválido en date, use YYYY-MM-DD"}), 400
            apply_local_window_check = True
            a_start, a_end, b_start, b_end = _normalize_range_local(win_start_local, win_end_local)
            sql_start = min(a_start, b_start)
            sql_end = max(a_end, b_end)
            query = query.filter(Dispatch.fecha >= sql_start, Dispatch.fecha < sql_end)

        query = query.order_by(Dispatch.fecha.asc())

        # Aplicar paginación
        dispatches = query.paginate(page=page, per_page=limit, error_out=False).items

        # Filtro de ventana local
        if apply_local_window_check:
            dispatches = [
                d for d in dispatches
                if win_start_local <= to_local(d.fecha) < win_end_local
            ]

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
            cliente_norm = " ".join((cliente_name or "").strip().split())
            cliente = Client.query.filter(func.lower(Client.name) == cliente_norm.lower()).first()
            if not cliente:
                current_user = get_jwt_identity()
                cliente = Client(name=cliente_norm, created_by=current_user)
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
            # 1) Mapear cantidades actuales del despacho (antes de modificar) por nombre
            old_qty_by_name: dict[str, float] = {}
            for item in d.productos:
                try:
                    q = float(item.cantidad or 0)
                except Exception:
                    q = 0.0
                old_qty_by_name[item.nombre] = old_qty_by_name.get(item.nombre, 0.0) + q

            # 2) Validar y preparar las filas nuevas + mapear cantidades nuevas por nombre
            new_rows: list[DispatchProduct] = []
            new_qty_by_name: dict[str, float] = {}

            for p in data["productos"]:
                if not all(k in p for k in ("nombre", "cantidad", "unidad")):
                    db.session.rollback()
                    return jsonify({"error": "Cada producto requiere nombre, cantidad y unidad"}), 400

                nombre = p["nombre"]
                unidad = p["unidad"]
                try:
                    cantidad = float(p["cantidad"] or 0)
                except Exception:
                    cantidad = 0.0

                new_rows.append(
                    DispatchProduct(dispatch_id=d.id, nombre=nombre, cantidad=cantidad, unidad=unidad)
                )
                new_qty_by_name[nombre] = new_qty_by_name.get(nombre, 0.0) + cantidad

            # Asegurar existencia de productos nuevos por nombre (no duplica si ya existe)
            current_user = get_jwt_identity()
            for nombre in new_qty_by_name.keys():
                nn = (nombre or "").strip()
                exists = Product.query.filter(func.lower(Product.name) == nn.lower()).first()
                if not exists:
                    db.session.add(Product(name=nn, category="Otros", created_by=current_user, stock=0.0))

            # 3) Calcular diferencias y ajustar stock global de Product por nombre
            all_names = set(old_qty_by_name.keys()) | set(new_qty_by_name.keys())
            for nombre in all_names:
                old_q = float(old_qty_by_name.get(nombre, 0.0))
                new_q = float(new_qty_by_name.get(nombre, 0.0))
                delta_en_despacho = new_q - old_q
                if delta_en_despacho != 0:
                    prod_row =  Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
                    if prod_row:
                        try:
                            prod_row.stock = float(prod_row.stock or 0) - float(delta_en_despacho)
                        except Exception:
                            pass

            # 4) Reemplazar los ítems del despacho por los nuevos
            DispatchProduct.query.filter_by(dispatch_id=d.id).delete()
            for row in new_rows:
                db.session.add(row)

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
        # Obtener parámetros opcionales
        year = request.args.get("year")
        month = request.args.get("month")
        
        # Determinar el rango de fechas
        if year and month:
            try:
                year = int(year)
                month = int(month)
                if not (1 <= month <= 12):
                    raise ValueError("Mes inválido")
                # Primer día del mes especificado
                start_local = datetime(year, month, 1, tzinfo=CL_TZ)
            except ValueError:
                return jsonify({"error": "Año y mes deben ser números válidos (mes entre 1 y 12)"}), 400
        else:
            # Si no se especifican, usar el mes actual
            start_local = month_start_local_now()

        start_utc_naive = to_utc_naive(start_local)
        # Último día del mes (ajustado dinámicamente)
        end_local = (start_local.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        end_utc_naive = to_utc_naive(end_local)

        data_points = [0] * 31

        current_user_id = str(get_jwt_identity())

        dispatches = Dispatch.query.filter(
            Dispatch.created_by == current_user_id,
            Dispatch.fecha >= start_utc_naive,
            Dispatch.fecha <= end_utc_naive
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
# ----------------------------
@dispatch_bp.route("/dispatches/<int:dispatch_id>/mark-driver", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
@jwt_required(optional=True)
def mark_driver_delivered(dispatch_id):
    if request.method == "OPTIONS":
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
# ----------------------------
@dispatch_bp.route("/dispatches/<int:dispatch_id>/mark-client", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
@jwt_required(optional=True)
def mark_client_delivered(dispatch_id):
    if request.method == "OPTIONS":
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
@cross_origin(supports_credentials=True)
@jwt_required(optional=True)
def delete_dispatch(dispatch_id):
    if request.method == "OPTIONS":
        return ("", 204)

    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401

    try:
        d = Dispatch.query.get_or_404(dispatch_id)

        # Restaurar stock
        for item in d.productos:
            nombre = (item.nombre or "").strip()
            prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
            if prod_row:
                try:
                    prod_row.stock = float(prod_row.stock or 0) + float(item.cantidad or 0)
                except Exception:
                    pass

        DispatchProduct.query.filter_by(dispatch_id=d.id).delete()
        db.session.delete(d)
        db.session.commit()
        return jsonify({"message": "Despacho eliminado"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo eliminar el despacho", "details": str(e)}), 500