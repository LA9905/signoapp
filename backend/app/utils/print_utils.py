from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from barcode import Code128
from barcode.writer import ImageWriter
import io
from datetime import datetime

def generar_hoja_despacho(despacho_data):
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)

    ancho, alto = A4
    margen = 20 * mm
    y = alto - margen

    # Título
    c.setFont("Helvetica-Bold", 16)
    c.drawString(margen, y, "Signo Representaciones Lda.")
    y -= 20

    # Datos principales
    c.setFont("Helvetica", 12)
    c.drawString(margen, y, f"Fecha de creación: {despacho_data['fecha']}")
    y -= 15
    c.drawString(margen, y, f"Auxiliar: {despacho_data['auxiliar']}")
    y -= 15
    c.drawString(margen, y, f"Chofer: {despacho_data['chofer']}")
    y -= 15
    c.drawString(margen, y, f"Cliente: {despacho_data['cliente']}")
    y -= 25

    c.setFont("Helvetica-Bold", 12)
    c.drawString(margen, y, "Productos:")
    y -= 15

    c.setFont("Helvetica", 12)
    for producto in despacho_data["productos"]:
        c.drawString(margen + 10, y, f"- {producto}")
        y -= 15

    # Generar código de barras
    barcode_data = despacho_data["codigo_barras"]
    barcode_img = Code128(barcode_data, writer=ImageWriter())
    barcode_buffer = io.BytesIO()
    barcode_img.write(barcode_buffer)

    # Insertar código de barras en PDF
    from PIL import Image
    barcode_buffer.seek(0)
    img = Image.open(barcode_buffer)
    img_path = "barcode_temp.png"
    img.save(img_path)

    c.drawImage(img_path, margen, y - 60, width=150, height=50)

    # Finalizar PDF
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer
