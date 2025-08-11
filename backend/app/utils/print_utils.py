from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from barcode import Code128
from barcode.writer import ImageWriter
from io import BytesIO

def _gen_code128_image(text: str) -> BytesIO:
    """Genera una imagen PNG de Code128 en memoria."""
    barcode = Code128(text, writer=ImageWriter())
    out = BytesIO()
    # tamaño/quiet zone por defecto son legibles; puedes ajustar si lo requieres
    barcode.write(out, options={"write_text": False, "quiet_zone": 2.0})
    out.seek(0)
    return out

def generar_hoja_despacho(d: dict) -> BytesIO:
    """
    d = {
      empresa, fecha, auxiliar, chofer, cliente, orden,
      productos: [str, ...],
      codigo_barras: str,
      folio: int
    }
    """
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    W, H = A4
    M = 18 * mm
    y = H - M

    # Encabezado
    c.setFont("Helvetica-Bold", 16)
    c.drawString(M, y, d.get("empresa", ""))
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.grey)
    c.drawRightString(W - M, y, f"Folio: {d.get('folio','')}")
    c.setFillColor(colors.black)
    y -= 18

    c.setLineWidth(0.5)
    c.line(M, y, W - M, y)
    y -= 10

    # Datos principales
    c.setFont("Helvetica", 11)
    c.drawString(M, y, f"Fecha de creación: {d.get('fecha','')}")
    y -= 14
    c.drawString(M, y, f"Creado por: {d.get('auxiliar','')}")
    y -= 14
    c.drawString(M, y, f"Chofer asignado: {d.get('chofer','')}")
    y -= 14
    c.drawString(M, y, f"Cliente: {d.get('cliente','')}")
    y -= 14
    c.drawString(M, y, f"N° Orden: {d.get('orden','')}")
    y -= 18

    # Detalle de productos
    c.setFont("Helvetica-Bold", 12)
    c.drawString(M, y, "Detalle de productos")
    y -= 12
    c.setLineWidth(0.3)
    c.line(M, y, W - M, y)
    y -= 10

    c.setFont("Helvetica", 11)
    for idx, item in enumerate(d.get("productos", []), start=1):
        if y < 60 * mm:  # salto de página si queda poco espacio (reserva para código de barras)
            c.showPage()
            y = H - M
            c.setFont("Helvetica-Bold", 12)
            c.drawString(M, y, "Detalle de productos (cont.)")
            y -= 18
            c.setFont("Helvetica", 11)
        c.drawString(M, y, f"{idx}. {item}")
        y -= 14

    # Bloque del código de barras
    y = max(y, 60 * mm)  # asegurar espacio
    y -= 8
    c.setFont("Helvetica-Bold", 12)
    c.drawString(M, y, "Código de barras (productos)")
    y -= 6
    c.setLineWidth(0.3)
    c.line(M, y, W - M, y)
    y -= 56

    barcode_text = d.get("codigo_barras", "")
    try:
        barcode_img_buf = _gen_code128_image(barcode_text)
        img = ImageReader(barcode_img_buf)
        c.drawImage(img, M, y, width=130*mm, height=25*mm, preserveAspectRatio=True, mask='auto')
    except Exception:
        # Si falla por longitud/caracteres, se muestra el texto como fallback
        c.setFont("Helvetica-Oblique", 10)
        c.setFillColor(colors.red)
        c.drawString(M, y + 20, "No se pudo generar el código de barras. Texto:")
        c.setFillColor(colors.black)
        c.drawString(M, y + 6, barcode_text[:100])

    # Pie
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.grey)
    c.drawRightString(W - M, 14 * mm, "Documento generado automáticamente")
    c.setFillColor(colors.black)

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer