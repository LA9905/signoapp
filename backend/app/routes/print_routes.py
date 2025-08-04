from flask import Blueprint, send_file, request
from app.utils.print_utils import generar_hoja_despacho
from datetime import datetime

print_bp = Blueprint("print", __name__)

@print_bp.route("/api/print/<int:despacho_id>", methods=["GET"])
def print_despacho(despacho_id):
    # 🚧 Aquí deberías obtener los datos desde tu base de datos
    despacho_mock = {
        "fecha": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "auxiliar": "Alejandro",
        "chofer": "Pedro",
        "cliente": "Comercial ABC",
        "productos": ["Bolsa Negra 60x90", "Vaso Espumado 12oz", "Detergente 1L"],
        "codigo_barras": f"DESP-{despacho_id}"
    }

    pdf_file = generar_hoja_despacho(despacho_mock)
    return send_file(pdf_file, as_attachment=True, download_name=f"despacho_{despacho_id}.pdf", mimetype="application/pdf")
