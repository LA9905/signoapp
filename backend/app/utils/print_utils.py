from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from barcode import Code128
from barcode.writer import ImageWriter
from io import BytesIO
from pathlib import Path
import re

# -------------------------------------------------------------------
# Logo: coloca una copia en backend/app/static/logo.jpg
# -------------------------------------------------------------------
LOGO_PATH = Path(__file__).resolve().parent.parent / "static" / "logo.jpg"

# ---------- Helpers de código de barras ----------

def _sanitize_barcode_text(text: str, max_len: int = 64) -> str:
    if not isinstance(text, str):
        text = str(text or "")
    text = re.sub(r"\s+", "-", text.strip())
    text = re.sub(r"[^A-Za-z0-9\-_|:./]", "", text)
    return text[:max_len]

def _gen_code128_image(text: str) -> BytesIO:
    payload = _sanitize_barcode_text(text)
    barcode = Code128(payload, writer=ImageWriter())
    out = BytesIO()
    barcode.write(
        out,
        options={
            "write_text": False,
            "module_width": 0.40,   # barras anchas
            "module_height": 28.0,  # alto (mm)
            "quiet_zone": 3.5,      # mm
            "background": "white",
            "foreground": "black",
            "text": "",
        },
    )
    out.seek(0)
    return out

# ---------- A4 (documento) ----------

def generar_hoja_despacho(d: dict) -> BytesIO:
    """
    Documento A4 con detalle + código de barras grande.
    d = {
      empresa, fecha, auxiliar, chofer, cliente, orden, productos: list[str],
      codigo_barras, folio, paquete_numero?, factura_numero?
    }
    """
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    W, H = A4
    M = 18 * mm
    y_top = H - M

    # Encabezado con logo y título
    title_fs = 16
    logo_w, logo_h = (14 * mm, 14 * mm)
    header_used_h = 0
    drew_logo = False

    if LOGO_PATH.exists():
        try:
            logo_img = ImageReader(str(LOGO_PATH))
            y_logo = y_top - logo_h + 1 * mm  # leve ajuste
            c.drawImage(logo_img, M, y_logo, width=logo_w, height=logo_h, mask="auto")
            drew_logo = True
            header_used_h = logo_h
        except Exception:
            drew_logo = False

    # Título
    c.setFont("Helvetica-Bold", title_fs)
    y_title = y_top - 5 * mm
    if drew_logo:
        c.drawString(M + logo_w + 6 * mm, y_title, d.get("empresa", ""))
    else:
        c.drawString(M, y_title, d.get("empresa", ""))

    # Folio claro y separado
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.grey)
    y_folio = y_top - 12 * mm
    c.drawRightString(W - M, y_folio, f"Folio: {d.get('folio','')}")
    c.setFillColor(colors.black)

    # Altura mínima para header
    header_used_h = max(header_used_h, 16 * mm)

    # Línea separadora y avance
    y = y_top - header_used_h - 6 * mm
    c.setLineWidth(0.5)
    c.line(M, y, W - M, y)
    y -= 10 * mm

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
    y -= 14

    # NUEVOS CAMPOS
    paquete_numero = d.get("paquete_numero")
    factura_numero = d.get("factura_numero")
    if paquete_numero:
        c.drawString(M, y, f"Paquete N°: {paquete_numero}")
        y -= 14
    if factura_numero:
        c.drawString(M, y, f"Factura N°: {factura_numero}")
        y -= 14

    y -= 4

    # Detalle de productos
    c.setFont("Helvetica-Bold", 12)
    c.drawString(M, y, "Detalle de productos")
    y -= 12
    c.setLineWidth(0.3)
    c.line(M, y, W - M, y)
    y -= 10

    c.setFont("Helvetica", 11)
    for idx, item in enumerate(d.get("productos", []), start=1):
        if y < 60 * mm:  # reserva espacio para el código
            c.showPage()
            # Reposicionar en nueva página
            y_top = H - M
            y = y_top - 10 * mm
            c.setFont("Helvetica-Bold", 12)
            c.drawString(M, y, "Detalle de productos (cont.)")
            y -= 18
            c.setFont("Helvetica", 11)
        c.drawString(M, y, f"{idx}. {item}")
        y -= 14

    # Bloque del código de barras (centrado y tamaño fijo)
    y = max(y, 60 * mm) - 8
    c.setFont("Helvetica-Bold", 12)
    c.drawString(M, y, "Código de barras (despacho)")
    y -= 6
    c.setLineWidth(0.3)
    c.line(M, y, W - M, y)
    y -= 62

    barcode_text = d.get("codigo_barras", "")
    try:
        barcode_img_buf = _gen_code128_image(barcode_text)
        img = ImageReader(barcode_img_buf)
        bw = 130 * mm
        bh = 28 * mm
        x = (W - bw) / 2.0
        c.drawImage(img, x, y, width=bw, height=bh, preserveAspectRatio=True, mask="auto")
    except Exception:
        c.setFont("Helvetica-Oblique", 10)
        c.setFillColor(colors.red)
        c.drawString(M, y + 12, "No se pudo generar el código de barras.")
        c.setFillColor(colors.black)

    # Pie
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.grey)
    c.drawRightString(W - M, 14 * mm, "Documento generado automáticamente")
    c.setFillColor(colors.black)

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer

# ---------- Etiqueta 4x6 in (térmica) ----------

def _page_size_from_label(size: str):
    size = (size or "").lower().strip()
    if size in ("4x6", "4×6", "4in x 6in", "4 in x 6 in"):
        return (101.6 * mm, 152.4 * mm)  # vertical
    if size in ("6x4", "6×4"):
        return (152.4 * mm, 101.6 * mm)  # horizontal
    return (101.6 * mm, 152.4 * mm)

def generar_etiqueta_despacho(d: dict, size: str = "4x6") -> BytesIO:
    """
    Etiqueta 4x6 con campos nuevos.
    """
    buffer = BytesIO()
    PAGE_W, PAGE_H = _page_size_from_label(size)
    c = canvas.Canvas(buffer, pagesize=(PAGE_W, PAGE_H))
    Mx = 6 * mm
    My = 8 * mm
    y_top = PAGE_H - My

    title_fs = 14
    logo_w, logo_h = (12 * mm, 12 * mm)
    header_used_h = 0
    drew_logo = False

    if LOGO_PATH.exists():
        try:
            logo_img = ImageReader(str(LOGO_PATH))
            y_logo = y_top - logo_h + 1 * mm
            c.drawImage(logo_img, Mx, y_logo, width=logo_w, height=logo_h, mask="auto")
            drew_logo = True
            header_used_h = logo_h
        except Exception:
            drew_logo = False

    # Título
    c.setFont("Helvetica-Bold", title_fs)
    y_title = y_top - 5 * mm
    if drew_logo:
        c.drawString(Mx + logo_w + 6 * mm, y_title, d.get("empresa", ""))
    else:
        c.drawString(Mx, y_title, d.get("empresa", ""))

    # Folio
    c.setFont("Helvetica", 9.5)
    c.setFillColor(colors.grey)
    y_folio = y_top - 10 * mm
    c.drawRightString(PAGE_W - Mx, y_folio, f"Folio: {d.get('folio','')}")
    c.setFillColor(colors.black)

    # Reservar altura mínima para header
    header_used_h = max(header_used_h, 14 * mm)

    # Línea separadora
    y = y_top - header_used_h - 6 * mm
    c.setLineWidth(0.5)
    c.line(Mx, y, PAGE_W - Mx, y)
    y -= 8 * mm

    # Datos clave
    c.setFont("Helvetica", 10.5)
    c.drawString(Mx, y, f"Fecha: {d.get('fecha','')}")
    y -= 12
    c.drawString(Mx, y, f"Cliente: {d.get('cliente','')}")
    y -= 12
    c.drawString(Mx, y, f"Chofer: {d.get('chofer','')}")
    y -= 12
    c.drawString(Mx, y, f"Orden: {d.get('orden','')}")
    y -= 12

    paquete_numero = d.get("paquete_numero")
    factura_numero = d.get("factura_numero")
    if paquete_numero:
        c.drawString(Mx, y, f"Paquete N°: {paquete_numero}")
        y -= 12
    if factura_numero:
        c.drawString(Mx, y, f"Factura N°: {factura_numero}")
        y -= 12

    c.drawString(Mx, y, f"Creado por: {d.get('auxiliar','')}")
    y -= 12

    # Lista de productos (con límite para no pisar el código)
    productos = d.get("productos", []) or []
    if productos:
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(Mx, y, "Productos:")
        y -= 11
        c.setFont("Helvetica", 10)
        max_lines = 7
        for idx, item in enumerate(productos[:max_lines], start=1):
            c.drawString(Mx, y, f"{idx}. {item}")
            y -= 11
        if len(productos) > max_lines:
            c.setFillColor(colors.grey)
            c.drawString(Mx, y, f"... y {len(productos) - max_lines} más")
            c.setFillColor(colors.black)
            y -= 11

    # Separador antes del código
    y -= 4
    c.setLineWidth(0.4)
    c.line(Mx, y, PAGE_W - Mx, y)
    y -= 6

    # Código de barras centrado (tamaño fijo)
    try:
        barcode_text = d.get("codigo_barras", "")
        barcode_img_buf = _gen_code128_image(barcode_text)
        img = ImageReader(barcode_img_buf)

        bw = min(PAGE_W - 2 * Mx, 90 * mm)
        bh = 28 * mm
        x = (PAGE_W - bw) / 2.0
        y_bar = max(y - bh, 10 * mm)
        c.drawImage(img, x, y_bar, width=bw, height=bh, preserveAspectRatio=True, mask="auto")
    except Exception:
        c.setFont("Helvetica-Oblique", 9)
        c.setFillColor(colors.red)
        c.drawString(Mx, y, "No se pudo generar el código de barras.")
        c.setFillColor(colors.black)

    c.save()
    buffer.seek(0)
    return buffer