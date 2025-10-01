from flask import Blueprint, send_file, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models.dispatch_model import Dispatch
from app.models.client_model import Client
from app.models.driver_model import Driver
from app.models.user_model import User
from app.models.internal_consumption_model import InternalConsumption, InternalConsumptionProduct
from app.utils.print_utils import (
    generar_hoja_despacho,
    generar_etiqueta_despacho,
    generar_ticket_pos80,
    _sanitize_barcode_text,
)
from app.utils.timezone import to_local

print_bp = Blueprint("print", __name__)

def _barcode_payload(folio: int, orden: str, num_items: int, paquete_numero: int | None) -> str:
    """
    Payload corto y 100% escaneable por apps móviles (Code128).
    Ej: DESP-11|OC:8898|N:3|P:1
    """
    orden_clean = (orden or "").strip().replace(" ", "")
    pieces = [f"DESP-{folio}", f"OC:{orden_clean}", f"N:{num_items}"]
    if paquete_numero:
        pieces.append(f"P:{paquete_numero}")
    payload = "|".join(pieces)
    return _sanitize_barcode_text(payload, max_len=64)

@print_bp.route("/print/<int:despacho_id>", methods=["GET"])
@jwt_required()
def print_despacho(despacho_id):
    dispatch = Dispatch.query.get(despacho_id)
    if not dispatch:
        return jsonify({"error": "Despacho no encontrado"}), 404

    client = Client.query.get(dispatch.cliente_id)
    driver = Driver.query.get(dispatch.chofer_id)
    creator = User.query.get(dispatch.created_by) if str(dispatch.created_by).isdigit() else None

    productos = [f"{p.nombre} — {p.cantidad} {p.unidad}" for p in dispatch.productos]

    # Campos nuevos (defensivo por si aún no hay migración en alguna instancia)
    paquete_numero = getattr(dispatch, "paquete_numero", None)
    factura_numero = getattr(dispatch, "factura_numero", None)

    data = {
        "empresa": "Signo Representaciones Ltda.",
        "fecha": to_local(dispatch.fecha).strftime("%Y-%m-%d %H:%M"),
        "auxiliar": creator.name if creator else str(dispatch.created_by),
        "chofer": driver.name if driver else str(dispatch.chofer_id),
        "cliente": client.name if client else str(dispatch.cliente_id),
        "orden": dispatch.orden,
        "productos": productos,
        "folio": dispatch.id,
        # nuevos en layout
        "paquete_numero": paquete_numero,
        "factura_numero": factura_numero,
    }

    # Payload compacto (evita listas largas que vuelven ilegible el código)
    data["codigo_barras"] = _barcode_payload(
        folio=dispatch.id,
        orden=dispatch.orden,
        num_items=len(productos),
        paquete_numero=paquete_numero,
    )

    # Soporte de formatos
    fmt = (request.args.get("format") or "").lower().strip()
    size = request.args.get("size") or "4x6"

    if fmt == "pos80":
        pdf_buffer = generar_ticket_pos80(data)
    elif fmt == "label":
        pdf_buffer = generar_etiqueta_despacho(data, size=size)
    else:
        pdf_buffer = generar_hoja_despacho(data)

    inline = request.args.get("inline", "0") == "1"
    return send_file(
        pdf_buffer,
        as_attachment=not inline,
        download_name=f"despacho_{dispatch.id}.pdf",
        mimetype="application/pdf",
        max_age=0,
    )


@print_bp.route("/print-internal/<int:id>", methods=["GET"])
@jwt_required()
def print_internal(id):
    consumption = InternalConsumption.query.get(id)
    if not consumption:
        return jsonify({"error": "Consumo interno no encontrado"}), 404

    creator = User.query.get(consumption.created_by)

    productos = [f"{p.nombre} — {p.cantidad} {p.unidad}" for p in consumption.productos]

    data = {
        "empresa": "Signo Representaciones Ltda.",
        "fecha": to_local(consumption.fecha).strftime("%Y-%m-%d %H:%M"),
        "auxiliar": creator.name if creator else str(consumption.created_by),
        "nombre_retira": consumption.nombre_retira,
        "area": consumption.area,
        "motivo": consumption.motivo,
        "productos": productos,
        "folio": consumption.id,
        # No incluir 'codigo_barras' para evitar intento de generación
    }

    # Usa formato POS80 adaptado
    pdf_buffer = generar_ticket_pos80(data)

    inline = request.args.get("inline", "0") == "1"
    return send_file(
        pdf_buffer,
        as_attachment=not inline,
        download_name=f"consumo_interno_{consumption.id}.pdf",
        mimetype="application/pdf",
        max_age=0,
    )