import re
import unicodedata
from datetime import date, datetime, timedelta
from calendar import monthrange
from collections import defaultdict
from functools import lru_cache
from sqlalchemy import extract
from sqlalchemy.orm import joinedload
from app import db
from app.models.production_model import Production, ProductionProduct
from app.models.operator_activity_model import OperatorActivity
from app.models.operator_model import Operator
from app.utils.timezone import to_local, to_utc_naive, CL_TZ

# ── Horario laboral efectivo (ya descontada 1h de colación) ─────────────────
def horas_programadas(d: date) -> float:
    wd = d.weekday()  # 0=lunes ... 6=domingo
    if wd <= 3:        # Lunes a Jueves: 7:30-16:00 (8.5h) - 1h colación
        return 7.5
    elif wd == 4:       # Viernes: 7:00-15:00 (8h) - 1h colación
        return 7.0
    return 0.0


# ── Normalización de unidades y nombres de producto ──────────────────────────
_UNIDAD_MAP = {
    "unidades": "unidades", "unidad": "unidades", "und": "unidades", "un": "unidades", "u": "unidades",
    "kg": "kg", "kgs": "kg", "kilogramo": "kg", "kilogramos": "kg", "kilo": "kg", "kilos": "kg",
    "pqt": "pqt", "pqts": "pqt", "paquete": "pqt", "paquetes": "pqt", "paq": "pqt",
    "lt": "lt", "lts": "lt", "litro": "lt", "litros": "lt", "l": "lt",
    "cajas": "cajas", "caja": "cajas",
}


def normalizar_unidad(u: str) -> str:
    if not u:
        return u
    key = str(u).strip().lower()
    return _UNIDAD_MAP.get(key, key)


def normalizar_nombre(n: str) -> str:
    """Normaliza espacios (colapsa dobles espacios) preservando mayúsculas,
    para agrupar por producto exacto sin perder coincidencias por detalles
    de tipeo."""
    if not n:
        return n
    return " ".join(str(n).strip().split())


def get_operator_for_user(user):
    """Devuelve el Operator vinculado a este usuario, asignado por un
    administrador desde el panel de administración (User.linked_operator_id),
    o None si el usuario no tiene ningún operario vinculado (usuario
    normal)."""
    if not user or not user.linked_operator_id:
        return None
    return Operator.query.get(user.linked_operator_id)


def _ajustes_horas_por_dia(operator_id: int, year: int, month: int):
    """Devuelve (horas_otras, horas_extra) por fecha. 'otras' resta horas
    efectivas del día; 'extra' (sobretiempo) las suma."""
    acts = (
        OperatorActivity.query
        .filter(OperatorActivity.operator_id == operator_id)
        .filter(extract('year', OperatorActivity.fecha) == year)
        .filter(extract('month', OperatorActivity.fecha) == month)
        .all()
    )
    horas_otras = defaultdict(float)
    horas_extra = defaultdict(float)
    for a in acts:
        if a.tipo == "extra":
            horas_extra[a.fecha] += float(a.horas or 0)
        else:
            horas_otras[a.fecha] += float(a.horas or 0)
    return horas_otras, horas_extra

def _month_utc_bounds(year: int, month: int):
    """Límites del mes (hora de Chile) convertidos a UTC naive, para filtrar en la BD."""
    first_local = datetime(year, month, 1, 0, 0, 0, tzinfo=CL_TZ)
    last_day = monthrange(year, month)[1]
    next_month_local = datetime(year, month, last_day, 0, 0, 0, tzinfo=CL_TZ) + timedelta(days=1)
    return to_utc_naive(first_local), to_utc_naive(next_month_local)


def _entries_por_dia_y_producto(operator_id: int, year: int, month: int):
    """
    Recorre las producciones del mes de UN operario y arma, por día, cuántas
    líneas de producto hay por NOMBRE EXACTO de producto, más la
    cantidad total, la unidad y los días trabajados por cada producto.

    Se agrupa por nombre exacto de producto (no solo por unidad genérica
    kg/unidades/pqt), porque dos productos distintos en la misma unidad
    pueden tener velocidades de fabricación muy distintas (ej. bolsas
    pequeñas vs. bolsas grandes, ambas en "kg").

    También separa, por día y producto, cuántas horas se cargaron
    MANUALMENTE (campo opcional 'horas' en cada línea de producto) y,
    para las líneas que quedaron SIN ese dato, cuánta CANTIDAD se
    produjo (qty_sin_horas_por_dia) — necesaria para que
    _distribuir_horas_sin_manual pueda estimar cuánto tiempo debió
    tomar cada producto según su propia tasa de referencia, en vez de
    repartir el tiempo restante del día en partes iguales.
    """
    start_utc, end_utc = _month_utc_bounds(year, month)
    productions = (
        Production.query
        .options(joinedload(Production.productos))
        .filter(Production.operator_id == operator_id)
        .filter(Production.fecha >= start_utc, Production.fecha < end_utc)
        .all()
    )
    entries_por_dia = defaultdict(lambda: defaultdict(int))
    qty_por_producto = defaultdict(float)
    dias_por_producto = defaultdict(set)
    unidad_por_producto = {}
    horas_manual_por_dia = defaultdict(lambda: defaultdict(float))
    entries_sin_horas_por_dia = defaultdict(lambda: defaultdict(int))
    qty_sin_horas_por_dia = defaultdict(lambda: defaultdict(float))
    for p in productions:
        local_dt = to_local(p.fecha)
        d = local_dt.date()
        for prod in p.productos:
            nombre = normalizar_nombre(prod.nombre)
            entries_por_dia[d][nombre] += 1
            qty_por_producto[nombre] += float(prod.cantidad or 0)
            dias_por_producto[nombre].add(d)
            unidad_por_producto[nombre] = normalizar_unidad(prod.unidad)
            horas_manual = getattr(prod, "horas", None)
            if horas_manual is not None and horas_manual > 0:
                horas_manual_por_dia[d][nombre] += float(horas_manual)
            else:
                entries_sin_horas_por_dia[d][nombre] += 1
                qty_sin_horas_por_dia[d][nombre] += float(prod.cantidad or 0)
    return (
        entries_por_dia, qty_por_producto, dias_por_producto, unidad_por_producto,
        horas_manual_por_dia, entries_sin_horas_por_dia, qty_sin_horas_por_dia,
    )


def _compute_rate_by_product_for_month(operator_id: int, year: int, month: int):
    (
        entries_por_dia, qty_por_producto, dias_por_producto, unidad_por_producto,
        horas_manual_por_dia, _, qty_sin_horas_por_dia,
    ) = _entries_por_dia_y_producto(operator_id, year, month)
    if not entries_por_dia:
        return {}

    horas_otras_por_dia, horas_extra_por_dia = _ajustes_horas_por_dia(operator_id, year, month)

    horas_por_producto = defaultdict(float)
    for d, productos_dia in entries_por_dia.items():
        base = horas_programadas(d)
        otras = horas_otras_por_dia.get(d, 0.0)
        extra = horas_extra_por_dia.get(d, 0.0)
        horas_efectivas_dia = max(base - otras + extra, 0.0)

        horas_manual_dia = horas_manual_por_dia.get(d, {})
        qty_sin_horas_dia = qty_sin_horas_por_dia.get(d, {})

        # Las horas cargadas manualmente para un producto ese día se
        # respetan tal cual. El tiempo restante del día se reparte entre
        # los productos SIN horas manuales de forma PROPORCIONAL a su
        # tasa de referencia (récord propio o de un producto muy
        # similar) — ver _distribuir_horas_sin_manual — y solo cae a
        # partes iguales cuando ninguno de ellos tiene ninguna
        # referencia disponible.
        suma_horas_manual_dia = sum(horas_manual_dia.values())
        horas_restantes_dia = max(horas_efectivas_dia - suma_horas_manual_dia, 0.0)
        horas_repartidas_por_nombre = _distribuir_horas_sin_manual(
            horas_restantes_dia, qty_sin_horas_dia, year, month
        )

        for nombre in productos_dia:
            horas_manual_nombre = horas_manual_dia.get(nombre, 0.0)
            horas_repartidas = horas_repartidas_por_nombre.get(nombre, 0.0)
            horas_por_producto[nombre] += horas_manual_nombre + horas_repartidas

    resultado = {}
    for nombre in qty_por_producto:
        horas = horas_por_producto.get(nombre, 0.0)
        qty = qty_por_producto[nombre]
        dias = len(dias_por_producto[nombre])
        rate = (qty / horas) if horas > 0 else None
        resultado[nombre] = {
            "qty": qty, "dias": dias, "horas": horas, "rate": rate,
            "unidad": unidad_por_producto.get(nombre),
        }
    return resultado


@lru_cache(maxsize=8192)
def _rate_by_product_for_month_cached(operator_id: int, year: int, month: int):
    return _compute_rate_by_product_for_month(operator_id, year, month)


def rate_by_product_for_month(operator_id: int, year: int, month: int):
    """
    Tasa de producción por hora, calculada POR PRODUCTO EXACTO (no por
    unidad genérica). Los meses YA CERRADOS se cachean en memoria del
    proceso, porque tanto la línea base propia como la línea base global
    de producto piden estos mismos meses repetidamente. El mes EN CURSO
    nunca se cachea.
    """
    hoy = date.today()
    if year == hoy.year and month == hoy.month:
        return _compute_rate_by_product_for_month(operator_id, year, month)
    return _rate_by_product_for_month_cached(operator_id, year, month)


def baseline_for_operator_product(operator_id: int, year: int, month: int, nombre: str, n_meses: int = 12, min_dias: int = 10):
    """
    Mediana de la tasa de ESTE operario para ESTE producto exacto, en los
    últimos n_meses meses completos anteriores (>=min_dias días
    trabajados en ese producto). Es la referencia preferida cuando existe,
    porque respeta el ritmo natural de cada persona.
    """
    rates = []
    y, m = year, month
    checked = 0
    while checked < 12 and len(rates) < n_meses:
        m -= 1
        if m == 0:
            m, y = 12, y - 1
        checked += 1
        data = rate_by_product_for_month(operator_id, y, m).get(nombre)
        if data and data["rate"] is not None and data["dias"] >= min_dias:
            rates.append(data["rate"])
    if not rates:
        return None
    rates.sort()
    mid = len(rates) // 2
    if len(rates) % 2 == 1:
        return rates[mid]
    return (rates[mid - 1] + rates[mid]) / 2


@lru_cache(maxsize=8192)
def baseline_global_product(nombre: str, year: int, month: int, n_meses: int = 6, min_dias: int = 10):
    """
    Mediana histórica de TODOS los operarios que hayan fabricado este
    producto exacto, en los últimos n_meses meses completos anteriores.

    Esta es la referencia que se usa cuando un operario NO tiene
    historial propio en este producto (por ejemplo: es nuevo en la
    empresa, o nuevo en esta tarea). Sin esto, un operario nuevo que
    siempre rinde bajo terminaría autocalificándose "Regular" contra sí
    mismo, aunque el producto objetivamente permita mucho más — como
    quedó demostrado por operarios anteriores que sí lo fabricaron a
    mayor ritmo. Al comparar contra el histórico real del PRODUCTO (no
    contra otro operario con un producto distinto), la comparación sigue
    siendo justa: es la misma tarea física, la haga quien la haga.
    """
    rates = []
    y, m = year, month
    checked = 0
    while checked < 12 and len(rates) < n_meses * 3:  # margen: puede haber varios operarios por mes
        m -= 1
        if m == 0:
            m, y = 12, y - 1
        checked += 1
        for op in Operator.query.all():
            data = rate_by_product_for_month(op.id, y, m).get(nombre)
            if data and data["rate"] is not None and data["dias"] >= min_dias:
                rates.append(data["rate"])
        if checked >= n_meses and rates:
            break
    if not rates:
        return None
    rates.sort()
    mid = len(rates) // 2
    if len(rates) % 2 == 1:
        return rates[mid]
    return (rates[mid - 1] + rates[mid]) / 2


def baseline_peers_current_month(nombre: str, year: int, month: int, exclude_operator_id: int, min_dias: int = 1):
    """
    Mediana de la tasa de OTROS operarios que hayan fabricado este mismo
    producto en el MISMO mes que se está evaluando (comparación entre
    compañeros en tiempo real, dentro del mes actual).

    Se usa como respaldo cuando todavía no existe historial de meses
    ANTERIORES para este producto (por ejemplo: es un producto nuevo en
    el sistema, o es el primer día que se registra). Sin este respaldo,
    el primer registro de un producto nuevo siempre daría ratio = 1.0
    (100%) para cualquier operario que lo fabrique, sin importar cuánto
    produjo comparado con un compañero que registró el mismo producto
    ese mismo día — que es exactamente lo que se necesita distinguir
    cuando dos operarios cargan el mismo producto por primera vez.
    """
    rates = []
    for op in Operator.query.all():
        if op.id == exclude_operator_id:
            continue
        data = rate_by_product_for_month(op.id, year, month).get(nombre)
        if data and data["rate"] is not None and data["dias"] >= min_dias:
            rates.append(data["rate"])
    if not rates:
        return None
        rates.sort()
    mid = len(rates) // 2
    if len(rates) % 2 == 1:
        return rates[mid]
    return (rates[mid - 1] + rates[mid]) / 2


# Mes desde el cual se empieza a construir el historico de records
# "limpio". Los meses ANTERIORES a este quedan con los datos que ya
# tienen (no se tocan ni se recalculan distinto), pero DEJAN de usarse
# como fuente para la linea base de ningun producto, porque corresponden
# a cuando el sistema de horas por producto todavia no existia y tienen
# demasiadas inconsistencias para confiar en ellos. A partir de este mes
# (inclusive), el historico de records se construye desde cero, limpio.
BASELINE_CUTOFF_YEAR = 2026
BASELINE_CUTOFF_MONTH = 8


# ── Reparto inteligente de horas para líneas SIN horas manuales ─────────────
#
# Cuando un registro de producción tiene dos o más productos y a ninguno (o
# a alguno) se le indicó cuánto tiempo específico tomó, el sistema necesita
# repartir el tiempo restante del día entre esos productos. Repartir en
# partes iguales es incorrecto porque distintos productos tardan tiempos muy
# distintos por unidad — inflar el tiempo de uno rápido y desinflar el de
# uno lento distorsiona el ratio real de ambos, y puede llegar a fabricar un
# "récord" falso a partir de datos que nunca reflejaron la realidad.
#
# Se reparte el tiempo PROPORCIONALMENTE a cuánto debería haber
# tomado cada producto según su propia tasa de referencia (el mejor
# rendimiento conocido para ese producto exacto, o el de un producto muy
# similar si no hay uno propio). Solo se cae a partes iguales cuando
# absolutamente ningún producto del día tiene ninguna referencia posible.

def _normalizar_texto_para_similitud(texto: str) -> str:
    texto = (texto or "").strip()
    nfkd = unicodedata.normalize("NFKD", texto)
    sin_acentos = "".join(c for c in nfkd if not unicodedata.combining(c))
    return sin_acentos.lower()


# Palabras genéricas que se ignoran al comparar nombres de producto por
# similitud (unidades, conectores) — lo que realmente distingue la
# velocidad de fabricación son las medidas y el tipo/material.
_STOPWORDS_PRODUCTO = {
    "de", "x", "y", "con", "sin", "el", "la", "los", "las", "un", "una",
    "para", "por", "und", "unidades", "unidad", "kg", "kgs", "pqt", "pqts",
    "cajas", "caja", "lt", "lts",
}

# Puntaje mínimo de similitud (0 a 1) para aceptar un producto "parecido"
# como referencia. Por debajo de esto, se considera que no hay relación
# real entre los productos y no se usa su tasa.
SIMILARITY_THRESHOLD_PRODUCTO = 0.3


def _extraer_dims_y_palabras(nombre: str):
    """
    Extrae del nombre de un producto dos conjuntos usados para medir
    similitud con otros productos cuando no hay ninguna tasa (récord)
    conocida para el nombre exacto:
      - dims: números presentes en el nombre (medidas, micronaje).
      - palabras: palabras no numéricas ni genéricas (tipo/material,
        nomenclatura), para comparar productos del mismo tipo.
    """
    texto = _normalizar_texto_para_similitud(nombre)
    numeros_crudos = re.findall(r"\d+(?:[.,]\d+)?", texto)
    dims = set()
    for n in numeros_crudos:
        try:
            dims.add(round(float(n.replace(",", ".")), 4))
        except ValueError:
            pass
    palabras_crudas = re.split(r"[^a-zñ0-9]+", texto)
    palabras = {
        w for w in palabras_crudas
        if w and not w[0].isdigit() and w not in _STOPWORDS_PRODUCTO and len(w) > 1
    }
    return dims, palabras


def _similitud_productos(dims_a, palabras_a, dims_b, palabras_b) -> float:
    """
    Puntaje de similitud (0 a 1) entre dos productos. Pondera más las
    medidas/micronaje (70%) que las palabras de tipo/material (30%),
    porque dos productos con la misma medida exacta suelen fabricarse a
    un ritmo mucho más parecido entre sí que dos que solo comparten
    palabras genéricas de nomenclatura.
    """
    if not dims_a and not palabras_a:
        return 0.0
    dim_overlap = (len(dims_a & dims_b) / len(dims_a)) if dims_a else 0.0
    palabra_overlap = 0.0
    union = palabras_a | palabras_b
    if union:
        palabra_overlap = len(palabras_a & palabras_b) / len(union)
    return 0.7 * dim_overlap + 0.3 * palabra_overlap


@lru_cache(maxsize=8)
def _reference_rate_map(upto_year: int, upto_month: int):
    """
    Mapa nombre_producto -> mejor tasa (unidades/hora) conocida de forma
    NO ambigua, usado únicamente para GUIAR el reparto de horas de un día
    con varios productos sin horas específicas (ver
    _distribuir_horas_sin_manual). Nunca se usa para mostrar récords al
    usuario — solo como referencia interna de cálculo.

    Se construye SOLO a partir de dos fuentes 100% confiables, para no
    caer en un cálculo circular (usar un reparto ya "adivinado" para
    adivinar otro reparto):
      1. Líneas de producción con horas MANUALES indicadas por el
         usuario — dato real, sin ambigüedad.
      2. Días donde el operario fabricó UN SOLO producto (sin importar
         cuántas líneas de producción tenga ese día) — las horas
         efectivas del día completo pertenecen inequívocamente a ese
         único producto, no hace falta repartir nada.

    Limitado a datos hasta upto_year/upto_month (nunca usa meses
    futuros para adivinar un mes pasado) y, como el resto de los
    récords, nunca usa datos anteriores a BASELINE_CUTOFF_*.
    """
    start_utc, _ = _month_utc_bounds(BASELINE_CUTOFF_YEAR, BASELINE_CUTOFF_MONTH)
    _, end_utc = _month_utc_bounds(upto_year, upto_month)

    productions = (
        Production.query
        .options(joinedload(Production.productos))
        .filter(Production.fecha >= start_utc, Production.fecha < end_utc)
        .filter(Production.operator_id.isnot(None))
        .all()
    )

    otras_por_operador_dia = defaultdict(lambda: defaultdict(float))
    extra_por_operador_dia = defaultdict(lambda: defaultdict(float))
    for act in OperatorActivity.query.all():
        if act.tipo == "extra":
            extra_por_operador_dia[act.operator_id][act.fecha] += float(act.horas or 0)
        else:
            otras_por_operador_dia[act.operator_id][act.fecha] += float(act.horas or 0)

    qty_por_op_dia = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))
    horas_manual_por_op_dia = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))
    tiene_manual_por_op_dia = defaultdict(lambda: defaultdict(lambda: defaultdict(bool)))

    for p in productions:
        op_id = p.operator_id
        d = to_local(p.fecha).date()
        for prod in p.productos:
            nombre = normalizar_nombre(prod.nombre)
            qty_por_op_dia[op_id][d][nombre] += float(prod.cantidad or 0)
            horas_manual = getattr(prod, "horas", None)
            if horas_manual is not None and horas_manual > 0:
                horas_manual_por_op_dia[op_id][d][nombre] += float(horas_manual)
                tiene_manual_por_op_dia[op_id][d][nombre] = True

    muestras = defaultdict(list)

    for op_id, dias in qty_por_op_dia.items():
        otras_dia_op = otras_por_operador_dia.get(op_id, {})
        extra_dia_op = extra_por_operador_dia.get(op_id, {})
        for d, productos_dia in dias.items():
            # Fuente 1: horas manuales, siempre confiables.
            horas_manual_dia = horas_manual_por_op_dia[op_id].get(d, {})
            for nombre, horas in horas_manual_dia.items():
                qty = productos_dia.get(nombre, 0.0)
                if horas > 0 and qty > 0:
                    muestras[nombre].append(qty / horas)

            # Fuente 2: día con un solo producto distinto — sin
            # ambigüedad posible, aunque no traiga horas manuales.
            if len(productos_dia) == 1:
                nombre_unico = next(iter(productos_dia))
                if not tiene_manual_por_op_dia[op_id][d].get(nombre_unico):
                    base = horas_programadas(d)
                    otras = otras_dia_op.get(d, 0.0)
                    extra = extra_dia_op.get(d, 0.0)
                    horas_efectivas_dia = max(base - otras + extra, 0.0)
                    qty = productos_dia[nombre_unico]
                    if horas_efectivas_dia > 0 and qty > 0:
                        muestras[nombre_unico].append(qty / horas_efectivas_dia)

    return {nombre: max(rates) for nombre, rates in muestras.items() if rates}


@lru_cache(maxsize=8)
def _reference_rate_map_dims_cache(upto_year: int, upto_month: int):
    """Precalcula (dims, palabras) de cada producto que sí tiene una tasa
    de referencia conocida, para no repetir el análisis de texto en cada
    búsqueda de producto similar."""
    ref_map = _reference_rate_map(upto_year, upto_month)
    return {nombre: _extraer_dims_y_palabras(nombre) for nombre in ref_map}


def _unidad_para_producto(nombre: str):
    """
    Devuelve la unidad normalizada (kg, unidades, pqt, lt, cajas) del
    producto, según el registro más reciente en TODO el sistema. Es
    información ESTRUCTURAL del producto (un producto siempre se mide en
    la misma unidad), no una estimación de tasa — por eso no está
    limitada al mes evaluado como sí lo están las tasas de referencia.

    Se usa como filtro OBLIGATORIO al buscar un producto "similar": dos
    productos con la misma medida y nomenclatura pero distinta unidad
    (ej. "Bolsa T/R 90 x 120 x 0,06 x UND" vs "... x kg") NUNCA deben
    compararse entre sí, porque kg/hora y unidades/hora no son
    magnitudes comparables — mezclarlas produciría una referencia sin
    sentido físico.
    """
    return unidad_por_producto_map().get(nombre)


@lru_cache(maxsize=16384)
def _tasa_referencia_para_producto(nombre: str, upto_year: int, upto_month: int):
    """
    Devuelve (tasa, es_exacta) para guiar el reparto de horas de un
    producto sin horas manuales:
      - Si el producto tiene su propia tasa de referencia, la usa
        (es_exacta=True).
      - Si no, busca el producto más PARECIDO (misma medida/micronaje,
        nomenclatura similar) que sí tenga una tasa conocida
        (es_exacta=False).
      - Si no encuentra ninguno, devuelve (None, False).
    """
    ref_map = _reference_rate_map(upto_year, upto_month)
    if nombre in ref_map:
        return ref_map[nombre], True

    dims_cache = _reference_rate_map_dims_cache(upto_year, upto_month)
    dims_n, palabras_n = _extraer_dims_y_palabras(nombre)
    if not dims_n and not palabras_n:
        return None, False

    unidad_n = _unidad_para_producto(nombre)

    mejor_nombre = None
    mejor_score = 0.0
    for candidato, (dims_c, palabras_c) in dims_cache.items():
        # Filtro obligatorio: nunca comparar productos de unidades
        # distintas, sin importar cuán parecidas sean sus medidas o su
        # nombre (ver _unidad_para_producto). Si no se conoce la unidad
        # del producto evaluado (nunca se ha registrado antes), no se
        # aplica el filtro por falta de información — se compara contra todos los candidatos.
        if unidad_n is not None and _unidad_para_producto(candidato) != unidad_n:
            continue
        score = _similitud_productos(dims_n, palabras_n, dims_c, palabras_c)
        if score > mejor_score:
            mejor_score = score
            mejor_nombre = candidato

    if mejor_nombre is not None and mejor_score >= SIMILARITY_THRESHOLD_PRODUCTO:
        return ref_map[mejor_nombre], False

    return None, False


def _distribuir_horas_sin_manual(horas_restantes_dia: float, qty_sin_horas_dia: dict, upto_year: int, upto_month: int) -> dict:
    """
    Reparte horas_restantes_dia entre los productos de
    'qty_sin_horas_dia' (nombre -> cantidad producida ese día sin horas
    indicadas), de forma PROPORCIONAL al tiempo que cada producto
    debería haber tomado según su tasa de referencia (récord propio o
    de un producto muy similar), en vez de partes iguales.

    Se escala el conjunto completo por el mismo factor
    (horas_restantes_dia / suma_de_horas_ideales) tanto si faltan como
    si sobran horas respecto a lo "ideal" — así se conserva la
    proporción real entre un producto rápido y uno lento, en vez de
    borrarla como hacía el reparto en partes iguales.

    Los productos sin ninguna tasa (ni propia ni de uno similar) reciben
    el peso PROMEDIO de los que sí la tienen, para competir de forma
    razonable por el tiempo en vez de quedar en cero.

    Si NINGÚN producto del día tiene ninguna referencia, no hay base
    real para diferenciarlos y, como último recurso, se reparte en
    partes iguales — igual que el comportamiento anterior a este
    cambio.
    """
    nombres = list(qty_sin_horas_dia.keys())
    if not nombres:
        return {}
    if len(nombres) == 1:
        return {nombres[0]: horas_restantes_dia}

    pesos = {}
    pesos_conocidos = []
    for nombre in nombres:
        tasa, _ = _tasa_referencia_para_producto(nombre, upto_year, upto_month)
        if tasa and tasa > 0:
            qty = qty_sin_horas_dia[nombre]
            pesos[nombre] = qty / tasa
            pesos_conocidos.append(pesos[nombre])

    if not pesos_conocidos:
        horas_iguales = horas_restantes_dia / len(nombres)
        return {nombre: horas_iguales for nombre in nombres}

    peso_promedio = sum(pesos_conocidos) / len(pesos_conocidos)
    for nombre in nombres:
        if nombre not in pesos:
            pesos[nombre] = peso_promedio

    suma_pesos = sum(pesos.values())
    if suma_pesos <= 0:
        horas_iguales = horas_restantes_dia / len(nombres)
        return {nombre: horas_iguales for nombre in nombres}

    return {
        nombre: horas_restantes_dia * (pesos[nombre] / suma_pesos)
        for nombre in nombres
    }


@lru_cache(maxsize=6)
def _compute_daily_rates_bulk(upto_year: int, upto_month: int):
    """
    Calcula, en UNA sola pasada con dos consultas totales a la base de
    datos (una para producciones, otra para actividades), la tasa de
    producción por hora de TODOS los productos y TODOS los operarios,
    DÍA POR DÍA, desde BASELINE_CUTOFF_YEAR/BASELINE_CUTOFF_MONTH hasta
    el mes evaluado (inclusive). Todo lo anterior al corte queda
    excluido a propósito — ver el comentario de BASELINE_CUTOFF_* arriba.

    Devuelve un dict: nombre_producto -> lista de
    (rate, fecha, operator_id, qty, horas).

    Se cachea por (upto_year, upto_month) — incluyendo el mes en curso —
    porque invalidate_performance_caches() limpia este caché en cada
    creación, edición o eliminación de una producción, así que no hace
    falta el resguardo de "nunca cachear el mes actual" que sí usan
    otras funciones de este archivo.
    """
    start_utc, _ = _month_utc_bounds(BASELINE_CUTOFF_YEAR, BASELINE_CUTOFF_MONTH)
    _, end_utc = _month_utc_bounds(upto_year, upto_month)

    productions = (
        Production.query
        .options(joinedload(Production.productos))
        .filter(Production.fecha >= start_utc, Production.fecha < end_utc)
        .filter(Production.operator_id.isnot(None))
        .all()
    )

    otras_por_operador_dia = defaultdict(lambda: defaultdict(float))
    extra_por_operador_dia = defaultdict(lambda: defaultdict(float))
    for act in OperatorActivity.query.all():
        if act.tipo == "extra":
            extra_por_operador_dia[act.operator_id][act.fecha] += float(act.horas or 0)
        else:
            otras_por_operador_dia[act.operator_id][act.fecha] += float(act.horas or 0)

    qty_por_op_dia = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))
    horas_manual_por_op_dia = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))
    qty_sin_horas_por_op_dia = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))

    for p in productions:
        op_id = p.operator_id
        d = to_local(p.fecha).date()
        for prod in p.productos:
            nombre = normalizar_nombre(prod.nombre)
            qty_por_op_dia[op_id][d][nombre] += float(prod.cantidad or 0)
            horas_manual = getattr(prod, "horas", None)
            if horas_manual is not None and horas_manual > 0:
                horas_manual_por_op_dia[op_id][d][nombre] += float(horas_manual)
            else:
                qty_sin_horas_por_op_dia[op_id][d][nombre] += float(prod.cantidad or 0)

    resultados = defaultdict(list)

    for op_id, dias in qty_por_op_dia.items():
        otras_dia_op = otras_por_operador_dia.get(op_id, {})
        extra_dia_op = extra_por_operador_dia.get(op_id, {})
        for d, productos_dia in dias.items():
            base = horas_programadas(d)
            otras = otras_dia_op.get(d, 0.0)
            extra = extra_dia_op.get(d, 0.0)
            horas_efectivas_dia = max(base - otras + extra, 0.0)

            horas_manual_dia = horas_manual_por_op_dia[op_id].get(d, {})
            qty_sin_horas_dia = qty_sin_horas_por_op_dia[op_id].get(d, {})
            suma_horas_manual_dia = sum(horas_manual_dia.values())
            horas_restantes_dia = max(horas_efectivas_dia - suma_horas_manual_dia, 0.0)

            horas_repartidas_por_nombre = _distribuir_horas_sin_manual(
                horas_restantes_dia, qty_sin_horas_dia, upto_year, upto_month
            )

            for nombre, qty in productos_dia.items():
                horas_manual_nombre = horas_manual_dia.get(nombre, 0.0)
                horas_repartidas = horas_repartidas_por_nombre.get(nombre, 0.0)
                horas_dia_producto = horas_manual_nombre + horas_repartidas
                if horas_dia_producto > 0:
                    resultados[nombre].append((qty / horas_dia_producto, d, op_id, qty, horas_dia_producto))

    return resultados


@lru_cache(maxsize=1)
def unidad_por_producto_map():
    """
    Mapa nombre_normalizado -> unidad más reciente registrada para ese
    producto, calculado en UNA sola consulta (en vez de una consulta por
    producto, como se hacía antes en la ruta de récords). Se usa para
    mostrar la unidad correcta junto a cada récord.
    """
    rows = (
        db.session.query(Production.fecha, ProductionProduct.nombre, ProductionProduct.unidad)
        .join(ProductionProduct, ProductionProduct.production_id == Production.id)
        .all()
    )
    latest_fecha = {}
    latest_unidad = {}
    for fecha, nombre_raw, unidad_raw in rows:
        nombre = normalizar_nombre(nombre_raw)
        if nombre not in latest_fecha or fecha > latest_fecha[nombre]:
            latest_fecha[nombre] = fecha
            latest_unidad[nombre] = normalizar_unidad(unidad_raw)
    return latest_unidad


def baseline_historical_max_product(nombre: str, year: int, month: int, current_operator_id: int):
    """
    Línea base = el MEJOR rendimiento por hora jamás registrado, EN UN
    SOLO DÍA, para este producto exacto, considerando a todos los
    operarios y todo el histórico disponible hasta el mes evaluado,
    inclusive.

    Devuelve (mejor_tasa, fuente, fecha_record, operator_id_record, qty_record, horas_record):
      - "producto": el mejor día proviene de un mes ANTERIOR al
        evaluado — la referencia más sólida, ya demostrada en el pasado.
      - "pares_mes": no hay ningún mes anterior con datos; el mejor día
        es de OTRO operario, dentro del mismo mes evaluado.
      - "historica": no hay ningún mes anterior con datos de otros
        operarios; el mejor día es del propio operario, mismo mes
        evaluado, pero existen otros registros que no lo superaron.
      - "inicial": es literalmente el primer y único registro que existe
        de este producto en todo el sistema.
      - (None, None, None, None, None, None): el producto no tiene
        ningún registro.
    """
    rates = _compute_daily_rates_bulk(year, month).get(nombre, [])
    if not rates:
        return None, None, None, None, None, None

    if len(rates) == 1:
        rate, fecha, op_id, qty, horas = rates[0]
        return rate, "inicial", fecha, op_id, qty, horas

    rate, fecha, op_id, qty, horas = max(rates, key=lambda r: r[0])
    if (fecha.year, fecha.month) < (year, month):
        fuente = "producto"
    elif op_id == current_operator_id:
        fuente = "historica"
    else:
        fuente = "pares_mes"
    return rate, fuente, fecha, op_id, qty, horas


def current_record_for_product(nombre: str):
    """
    Récord actual (mejor producción por hora jamás registrada, EN UN SOLO
    DÍA) para un producto exacto, considerando todo el histórico hasta el
    mes en curso inclusive. Pensado para que cualquier operario pueda
    consultar, ANTES de fabricar un producto, cuál es la marca que debe
    superar para que su mes clasifique como "Alta" o "Muy Alta".

    Devuelve un dict con la tasa, fecha, operario, cantidad y horas del
    récord, o None si el producto nunca se ha fabricado.
    """
    hoy = date.today()
    rates = _compute_daily_rates_bulk(hoy.year, hoy.month).get(nombre, [])
    if not rates:
        return None
    rate, fecha, op_id, qty, horas = max(rates, key=lambda r: r[0])
    operator = Operator.query.get(op_id)
    return {
        "rate": round(rate, 3),
        "fecha": fecha.isoformat(),
        "operator_id": op_id,
        "operator_name": operator.name if operator else None,
        "cantidad": round(qty, 2),
        "horas": round(horas, 2),
    }


def invalidate_performance_caches():
    """
    Limpia todos los caches en memoria de rendimiento. Se DEBE llamar
    después de crear, editar o eliminar cualquier producción, porque
    esas operaciones pueden cambiar el histórico de meses YA CERRADOS
    (por ejemplo, al corregir o backdatear la fecha de una producción).
    """
    _rate_by_product_for_month_cached.cache_clear()
    _compute_daily_rates_bulk.cache_clear()
    unidad_por_producto_map.cache_clear()
    baseline_global_product.cache_clear()
    _reference_rate_map.cache_clear()
    _reference_rate_map_dims_cache.cache_clear()
    _tasa_referencia_para_producto.cache_clear()


UMBRALES = [
    (1.35, "extraordinaria", True),
    (1.00, "muy_alta", True),
    (0.87, "alta", True),
    (0.80, "regular_alta", False),
    (0.65, "regular", False),
    (0.50, "baja", False),
    (0.35, "muy_baja", False),
    (0.0,  "critica", False),
]

# Atributos extra por clasificación, además de bono sí/no.
CLASIFICACION_EXTRAS = {
    "extraordinaria": {"bono_extra": True, "premio": True},
    "muy_alta": {"bono_extra_consideracion": True},
    "regular_alta": {"bono_consideracion": True},
    "muy_baja": {"accion_requerida": True},
    "critica": {"accion_requerida": True, "accion_inmediata": True},
}

# Techo razonable para el ratio mostrado: evita que un mes con muy pocas
# horas registradas dispare un porcentaje sin sentido en el gráfico.
RATIO_MAX = 3.0
# Días mínimos trabajados en el mes EN CURSO antes de confiar en su
# clasificación (evita mostrar una nota engañosa a inicios de mes).
MIN_DIAS_MES_ACTUAL = 1


# DESPUÉS
def clasificar(ratio):
    if ratio is None:
        return "sin_datos", False
    for limite, etiqueta, bono in UMBRALES:
        if ratio >= limite:
            return etiqueta, bono
    return "critica", False


def evaluar_operador(operator_id: int, year: int, month: int):
    por_producto = rate_by_product_for_month(operator_id, year, month)

    detalle = []
    suma_ratio_ponderada = 0.0
    peso_total = 0.0
    horas_totales = 0.0

    for nombre, data in por_producto.items():
        if data["rate"] is None:
            continue

        # Línea base = el mejor rendimiento por hora jamás registrado, EN
        # UN SOLO DÍA, para este producto exacto, en TODO el histórico (no
        # un promedio mensual, y nunca sumando entre operarios). Solo se
        # cae a "inicial" (100% contra sí mismo) cuando es literalmente el
        # primer registro de este producto en todo el sistema.
        baseline, fuente, record_fecha, record_operator_id, record_qty, record_horas = baseline_historical_max_product(
            nombre, year, month, operator_id
        )
        if baseline is None:
            baseline = data["rate"]
            fuente = "inicial"
            record_fecha = None
            record_operator_id = None
            record_qty = None
            record_horas = None

        record_operator_name = None
        if record_operator_id is not None:
            record_operator = Operator.query.get(record_operator_id)
            record_operator_name = record_operator.name if record_operator else None

        ratio_producto = (data["rate"] / baseline) if baseline else None
        detalle.append({
            "nombre": nombre,
            "unidad": data["unidad"],
            "cantidad": round(data["qty"], 2),
            "horas": round(data["horas"], 2),
            "produccion_por_hora": round(data["rate"], 3),
            "linea_base": round(baseline, 3) if baseline else None,
            "linea_base_fuente": fuente,
            "linea_base_fecha": record_fecha.isoformat() if record_fecha else None,
            "linea_base_operario": record_operator_name,
            "linea_base_cantidad": round(record_qty, 2) if record_qty is not None else None,
            "linea_base_horas": round(record_horas, 2) if record_horas is not None else None,
            "ratio": round(ratio_producto, 3) if ratio_producto is not None else None,
        })

        if ratio_producto is not None:
            peso = data["horas"] or 0.0001  # evita división por peso cero en casos límite
            suma_ratio_ponderada += ratio_producto * peso
            peso_total += peso

        horas_totales += data["horas"]

    _, _, dias_por_producto, _, _, _, _ = _entries_por_dia_y_producto(operator_id, year, month)
    dias_totales = set()
    for dias_p in dias_por_producto.values():
        dias_totales |= dias_p

    ratio = (suma_ratio_ponderada / peso_total) if peso_total > 0 else None

    hoy = date.today()
    mes_en_curso = (year == hoy.year and month == hoy.month)

    if mes_en_curso and len(dias_totales) < MIN_DIAS_MES_ACTUAL:
        ratio = None
    elif ratio is not None:
        ratio = max(0.0, min(ratio, RATIO_MAX))
        # Redondear a 2 decimales ANTES de clasificar. Esto evita que un ratio de 0.8499999 se clasifique como "baja" en vez de "regular".
        ratio = round(ratio, 2)

    etiqueta, bono = clasificar(ratio)
    extras = CLASIFICACION_EXTRAS.get(etiqueta, {})

    principal = max(por_producto.items(), key=lambda kv: kv[1]["horas"])[0] if por_producto else None
    principal_data = por_producto.get(principal) if principal else None
    principal_detalle = next((d for d in detalle if d["nombre"] == principal), None)

    return {
        "unidad": principal_data["unidad"] if principal_data else None,
        "producto_principal": principal,
        "cantidad_mes": principal_data["qty"] if principal_data else 0.0,
        "dias_trabajados": len(dias_totales),
        "horas_efectivas": round(horas_totales, 1),
        "produccion_por_hora": principal_data["rate"] if principal_data and principal_data["rate"] is not None else None,
        "linea_base_historica": principal_detalle["linea_base"] if principal_detalle else None,
        "linea_base_fuente": principal_detalle["linea_base_fuente"] if principal_detalle else None,
        "linea_base_fecha": principal_detalle["linea_base_fecha"] if principal_detalle else None,
        "linea_base_operario": principal_detalle["linea_base_operario"] if principal_detalle else None,
        "linea_base_cantidad": principal_detalle["linea_base_cantidad"] if principal_detalle else None,
        "linea_base_horas": principal_detalle["linea_base_horas"] if principal_detalle else None,
        "ratio": round(ratio, 3) if ratio is not None else None,
        "clasificacion": etiqueta,
        "bono": bono,
        "bono_extra": extras.get("bono_extra", False),
        "bono_extra_consideracion": extras.get("bono_extra_consideracion", False),
        "bono_consideracion": extras.get("bono_consideracion", False),
        "premio": extras.get("premio", False),
        "accion_requerida": extras.get("accion_requerida", False),
        "accion_inmediata": extras.get("accion_inmediata", False),
        "mes_en_curso": mes_en_curso,
        "detalle_unidades": detalle,
    }


def daily_detail_for_operator(operator_id: int, year: int, month: int):
    """
    Desglose día a día del mes: cantidad producida del producto principal,
    horas programadas, horas de otras actividades y horas efectivas
    resultantes. Usado por la sección de detalle del operario (picos de
    producción por fecha).
    """
    qty_por_dia_producto = defaultdict(lambda: defaultdict(float))

    start_utc, end_utc = _month_utc_bounds(year, month)
    productions = (
        Production.query
        .options(joinedload(Production.productos))
        .filter(Production.operator_id == operator_id)
        .filter(Production.fecha >= start_utc, Production.fecha < end_utc)
        .all()
    )
    for p in productions:
        d = to_local(p.fecha).date()
        for prod in p.productos:
            nombre = normalizar_nombre(prod.nombre)
            qty_por_dia_producto[d][nombre] += float(prod.cantidad or 0)

    horas_otras_por_dia, horas_extra_por_dia = _ajustes_horas_por_dia(operator_id, year, month)
    por_producto = rate_by_product_for_month(operator_id, year, month)
    principal = max(por_producto.items(), key=lambda kv: kv[1]["horas"])[0] if por_producto else None

    resultado = []
    for d in sorted(qty_por_dia_producto.keys()):
        base = horas_programadas(d)
        otras = horas_otras_por_dia.get(d, 0.0)
        extra = horas_extra_por_dia.get(d, 0.0)
        horas_efectivas_dia = max(base - otras + extra, 0.0)
        cantidad_principal = qty_por_dia_producto[d].get(principal, 0.0) if principal else 0.0
        resultado.append({
            "fecha": d.isoformat(),
            "cantidad_producto_principal": round(cantidad_principal, 2),
            "cantidad_total_dia": round(sum(qty_por_dia_producto[d].values()), 2),
            "productos_dia": [
                {"nombre": nombre, "cantidad": round(qty, 2)}
                for nombre, qty in qty_por_dia_producto[d].items()
            ],
            "horas_programadas": base,
            "horas_otras_actividades": round(otras, 2),
            "horas_efectivas": round(horas_efectivas_dia, 2),
        })
    return resultado, principal