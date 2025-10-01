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

def _wrap_text(c, text: str, max_w: float, font: str = "Helvetica", size: float = 10.0) -> list[str]:
    """
    Divide `text` en varias líneas para que ninguna supere `max_w`
    con la fuente/tamaño dados.
    """
    text = str(text or "")
    words = text.split()
    if not words:
        return [""]
    lines = []
    current = words[0]
    for w in words[1:]:
        test = current + " " + w
        if c.stringWidth(test, font, size) <= max_w:
            current = test
        else:
            lines.append(current)
            current = w
    lines.append(current)
    return lines


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
    # 100 mm x 150 mm (vertical)
    if size in ("4x6", "4×6", "4in x 6in", "4 in x 6 in", "100x150", "100mm x 150mm"):
        return (100 * mm, 150 * mm)
    if size in ("6x4", "6×4"):
        return (150 * mm, 100 * mm)  # horizontal, 150 x 100 mm
    # por defecto también 100 x 150 mm
    return (100 * mm, 150 * mm)

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

    # ====== Campos compactos bajo el título (antes de la línea) ======
    y = y_top - header_used_h - 3 * mm
    c.setFont("Helvetica", 10.5)

    # helper: recorta texto teniendo en cuenta el rótulo
    def _fit(text: str, max_w: float, font="Helvetica", size=10.5) -> str:
        text = str(text or "")
        w = c.stringWidth(text, font, size)
        if w <= max_w:
            return text
        ell = "…"
        ell_w = c.stringWidth(ell, font, size)
        while text and c.stringWidth(text, font, size) + ell_w > max_w:
            text = text[:-1]
        return (text + ell) if text else ""

    def _draw_label_value(x, width, label, value):
        lbl_w = c.stringWidth(label, "Helvetica", 10.5)
        max_val_w = max(0, width - lbl_w - 2)
        val_fitted = _fit(value, max_val_w)
        c.drawString(x, y, label)
        c.drawString(x + lbl_w, y, val_fitted)

    line_w = PAGE_W - 2 * Mx

    # Fila 1: Fecha/Hora (55%)  | Chofer (45%)
    w_fecha  = line_w * 0.55
    w_chofer = line_w * 0.45
    x_fecha  = Mx
    x_chofer = Mx + w_fecha
    _draw_label_value(x_fecha,  w_fecha,  "Fecha: ",  d.get("fecha", ""))
    _draw_label_value(x_chofer, w_chofer, "Chofer: ", d.get("chofer", ""))
    y -= 11

    # Fila 2: Cliente (100%)
    _draw_label_value(Mx, line_w, "Centro de Costo: ", d.get("cliente", ""))
    y -= 11

    # Raya superior del bloque de información
    c.setLineWidth(0.5)
    c.line(Mx, y, PAGE_W - Mx, y)
    y -= 9  # un poco más de aire

    # ----- resto de campos (entre rayas) -----
    c.setFont("Helvetica", 10.5)

    # Orden más abajo para que no toque la raya
    y -= 3
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

    c.drawString(Mx, y, f"Despachado por: {d.get('auxiliar','')}")
    y -= 12

    # Lista de productos (envuelve líneas largas sin cortar)
    productos = d.get("productos", []) or []
    if productos:
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(Mx, y, "Productos:")
        y -= 11

        c.setFont("Helvetica", 10)
        line_h = 11

        # Altura mínima que debemos respetar para no chocar con el código de barras
        bh = 28 * mm  # alto del código de barras
        min_y = 10 * mm + bh + 18  # margen de seguridad

        remaining_items_count = 0
        truncated = False
        line_w = (PAGE_W - 2 * Mx)

        for idx, item in enumerate(productos, start=1):
            # Si ya no hay espacio suficiente para al menos una línea, cortamos
            if y - line_h < min_y:
                remaining_items_count = len(productos) - (idx - 1)
                truncated = True
                break

            prefix = f"{idx}. "
            prefix_w = c.stringWidth(prefix, "Helvetica", 10)
            # El texto envuelto se alinea después de la numeración
            max_w_text = max(0, line_w - prefix_w)

            lines = _wrap_text(c, item, max_w_text, "Helvetica", 10)

            # Pintamos la primera línea con el prefijo y las siguientes con sangría
            for j, line in enumerate(lines):
                if y - line_h < min_y:
                    # No hay espacio para seguir pintando este item
                    remaining_items_count = len(productos) - idx + 1
                    truncated = True
                    break

                if j == 0:
                    c.drawString(Mx, y, prefix + line)
                else:
                    c.drawString(Mx + prefix_w, y, line)
                y -= line_h

            if truncated:
                break

        if truncated and remaining_items_count > 0:
            c.setFillColor(colors.grey)
            c.drawString(Mx, y, f"... y {remaining_items_count} más")
            c.setFillColor(colors.black)
            y -= line_h

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


# --- POS 80 mm (ticket con largo variable) -------------------------------

def _measure_ticket_pos80_height(c, d: dict) -> float:
    W = 80 * mm
    Mx = 4 * mm
    My = 4 * mm
    line_w = W - 2 * Mx

    logo_h = 12 * mm if LOGO_PATH.exists() else 0
    header_h = max(logo_h, 14 * mm) + 3 * mm  # bloque superior

    body = 0
    row_h = 11

    # Común: Fecha y Registrado por
    body += row_h  # Fecha
    body += row_h  # Registrado por

    # Específicos por tipo
    if "chofer" in d:  # Es un despacho
        body += row_h  # Chofer
        body += row_h  # Centro de Costo
        body += 9      # raya + aire
        body += 12     # Orden
        if d.get("paquete_numero"):
            body += 12
        if d.get("factura_numero"):
            body += 12
    else:  # Es un consumo interno
        body += row_h  # Nombre quien retira
        body += row_h  # Área
        body += row_h  # Motivo
        body += 9      # raya + aire

    # Productos común
    productos = d.get("productos", []) or []
    if productos:
        body += 11  # título
        line_h = 11
        c.setFont("Helvetica", 10)
        for idx, item in enumerate(productos, start=1):
            prefix = f"{idx}. "
            pref_w = c.stringWidth(prefix, "Helvetica", 10)
            max_w_text = max(0, line_w - pref_w)
            lines = _wrap_text(c, str(item), max_w_text, "Helvetica", 10)
            body += line_h * max(1, len(lines))

    body += 10      # separador antes del código (solo si hay código)
    if "codigo_barras" in d:  # Solo para despachos
        bh = 28 * mm    # alto del código
        body += bh

    total = My + max(header_h, 0) + body + My
    return max(total, 120 * mm)


def generar_ticket_pos80(d: dict) -> BytesIO:
    buffer = BytesIO()

    W = 80 * mm
    Mx = 4 * mm
    My = 4 * mm
    line_w = W - 2 * Mx

    # Calculamos la altura necesaria
    _c_measure = canvas.Canvas(BytesIO(), pagesize=(W, 500 * mm))
    H = _measure_ticket_pos80_height(_c_measure, d)

    c = canvas.Canvas(buffer, pagesize=(W, H))
    y = H - My

    # Header: logo + empresa en una línea (logo un poco más arriba)
    title_fs = 14
    logo_w, logo_h = (12 * mm, 12 * mm)
    drew_logo = False
    if LOGO_PATH.exists():
        try:
            logo_img = ImageReader(str(LOGO_PATH))
            y_logo = y - logo_h + 3 * mm  # subir logo
            c.drawImage(logo_img, Mx, y_logo, width=logo_w, height=logo_h, mask="auto")
            drew_logo = True
        except Exception:
            drew_logo = False

    c.setFont("Helvetica-Bold", title_fs)
    if drew_logo:
        c.drawString(Mx + logo_w + 6 * mm, y - 4 * mm, d.get("empresa", ""))
        used_h = logo_h
    else:
        c.drawString(Mx, y - 5 * mm, d.get("empresa", ""))
        used_h = 14 * mm

    # Folio (gris)
    c.setFont("Helvetica", 9.5)
    c.setFillColor(colors.grey)
    c.drawRightString(W - Mx, y - 10 * mm, f"Folio: {d.get('folio','')}")
    c.setFillColor(colors.black)

    y -= used_h + 3 * mm

    # ---- Campos comunes y específicos ----
    c.setFont("Helvetica", 10.5)
    w_left = (W - 2 * Mx) * 0.55
    w_right = (W - 2 * Mx) * 0.45
    x_left = Mx
    x_right = Mx + w_left
    line_h = 11

    # Fecha (izq) y Registrado por (der)
    fecha_lines = _wrap_text(c, f"Fecha: {d.get('fecha','')}", w_left, "Helvetica", 10.5)
    auxiliar_lines = _wrap_text(c, f"Despachado por: {d.get('auxiliar','')}", w_right, "Helvetica", 10.5)
    for i in range(max(len(fecha_lines), len(auxiliar_lines))):
        if i < len(fecha_lines):
            c.drawString(x_left, y, fecha_lines[i])
        if i < len(auxiliar_lines):
            c.drawString(x_right, y, auxiliar_lines[i])
        y -= line_h

    # Específicos por tipo
    if "chofer" in d:  # Despacho
        chofer_lines = _wrap_text(c, f"Chofer: {d.get('chofer','')}", w_right, "Helvetica", 10.5)
        for line in chofer_lines:
            c.drawString(Mx, y, line)
            y -= line_h
        cliente_lines = _wrap_text(c, f"Centro de Costo: {d.get('cliente','')}", line_w, "Helvetica", 10.5)
        for line in cliente_lines:
            c.drawString(Mx, y, line)
            y -= line_h
        # Línea separadora
        c.setLineWidth(0.5)
        c.line(Mx, y, W - Mx, y)
        y -= 12
        c.drawString(Mx, y, f"Orden: {d.get('orden','')}")
        y -= 12
        if d.get("paquete_numero"):
            c.drawString(Mx, y, f"Paquete N°: {d.get('paquete_numero')}")
            y -= 12
        if d.get("factura_numero"):
            c.drawString(Mx, y, f"Factura N°: {d.get('factura_numero')}")
            y -= 12
    else:  # Consumo interno
        nombre_lines = _wrap_text(c, f"Nombre quien retira: {d.get('nombre_retira','')}", line_w, "Helvetica", 10.5)
        for line in nombre_lines:
            c.drawString(Mx, y, line)
            y -= line_h
        area_lines = _wrap_text(c, f"Área: {d.get('area','')}", line_w, "Helvetica", 10.5)
        for line in area_lines:
            c.drawString(Mx, y, line)
            y -= line_h
        motivo_lines = _wrap_text(c, f"Motivo: {d.get('motivo','')}", line_w, "Helvetica", 10.5)
        for line in motivo_lines:
            c.drawString(Mx, y, line)
            y -= line_h
        # Línea separadora
        c.setLineWidth(0.5)
        c.line(Mx, y, W - Mx, y)
        y -= 12

    # Productos común
    productos = d.get("productos", []) or []
    if productos:
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(Mx, y, "Productos:")
        y -= 11

        c.setFont("Helvetica", 10)
        for idx, item in enumerate(productos, start=1):
            prefix = f"{idx}. "
            pref_w = c.stringWidth(prefix, "Helvetica", 10)
            max_w_text = max(0, line_w - pref_w)
            lines = _wrap_text(c, str(item), max_w_text, "Helvetica", 10)
            for j, ln in enumerate(lines):
                if j == 0:
                    c.drawString(Mx, y, prefix + ln)
                else:
                    c.drawString(Mx + pref_w, y, ln)
                y -= line_h

    # Separador antes del código (solo si hay código)
    if "codigo_barras" in d:
        y -= 4
        c.setLineWidth(0.4)
        c.line(Mx, y, W - Mx, y)
        y -= 6

        # Código de barras
        try:
            barcode_img_buf = _gen_code128_image(d.get("codigo_barras", ""))
            img = ImageReader(barcode_img_buf)
            bw = min(line_w, 58 * mm)
            bh = 28 * mm
            x = (W - bw) / 2.0
            c.drawImage(img, x, y - bh, width=bw, height=bh, preserveAspectRatio=True, mask="auto")
            y -= bh
        except Exception:
            c.setFont("Helvetica-Oblique", 9)
            c.setFillColor(colors.red)
            c.drawString(Mx, y, "No se pudo generar el código de barras.")
            c.setFillColor(colors.black)

    c.save()
    buffer.seek(0)
    return buffer