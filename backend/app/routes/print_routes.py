from flask import Blueprint, send_file, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models.dispatch_model import Dispatch, DispatchProduct
from app.models.client_model import Client
from app.models.driver_model import Driver
from app.models.user_model import User
from app.utils.print_utils import generar_hoja_despacho
from app.utils.timezone import to_local

print_bp = Blueprint("print", __name__)

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

    barcode_products = ", ".join([
        f"{p.nombre}x{int(p.cantidad) if float(p.cantidad).is_integer() else p.cantidad}"
        for p in dispatch.productos
    ])
    if len(barcode_products) > 200:
        barcode_products = barcode_products[:197] + "..."

    data = {
        "empresa": "Signo Representaciones Ltda.",
        "fecha": to_local(dispatch.fecha).strftime("%Y-%m-%d %H:%M"),  # 👈 hora local CL
        "auxiliar": creator.name if creator else str(dispatch.created_by),
        "chofer": driver.name if driver else str(dispatch.chofer_id),
        "cliente": client.name if client else str(dispatch.cliente_id),
        "orden": dispatch.orden,
        "productos": productos,
        "codigo_barras": barcode_products or f"DESP-{dispatch.id}",
        "folio": dispatch.id,
    }

    pdf_buffer = generar_hoja_despacho(data)
    inline = request.args.get("inline", "0") == "1"
    return send_file(
        pdf_buffer,
        as_attachment=not inline,
        download_name=f"despacho_{dispatch.id}.pdf",
        mimetype="application/pdf",
        max_age=0
    )