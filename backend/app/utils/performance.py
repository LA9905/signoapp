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


def _otras_horas_por_dia(operator_id: int, year: int, month: int):
    acts = (
        OperatorActivity.query
        .filter(OperatorActivity.operator_id == operator_id)
        .filter(extract('year', OperatorActivity.fecha) == year)
        .filter(extract('month', OperatorActivity.fecha) == month)
        .all()
    )
    horas_otras = defaultdict(float)
    for a in acts:
        horas_otras[a.fecha] += float(a.horas or 0)
    return horas_otras


def _month_utc_bounds(year: int, month: int):
    """Límites del mes (hora de Chile) convertidos a UTC naive, para filtrar en la BD."""
    first_local = datetime(year, month, 1, 0, 0, 0, tzinfo=CL_TZ)
    last_day = monthrange(year, month)[1]
    next_month_local = datetime(year, month, last_day, 0, 0, 0, tzinfo=CL_TZ) + timedelta(days=1)
    return to_utc_naive(first_local), to_utc_naive(next_month_local)


def _entries_por_dia_y_producto(operator_id: int, year: int, month: int):
    """
    Recorre las producciones del mes de UN operario y arma, por día, cuántas
    líneas de producto hay por NOMBRE EXACTO de producto (para repartir las
    horas proporcionalmente), más la cantidad total, la unidad y los días
    trabajados por cada producto.

    Se agrupa por nombre exacto de producto (no solo por unidad genérica
    kg/unidades/pqt), porque dos productos distintos en la misma unidad
    pueden tener velocidades de fabricación muy distintas (ej. bolsas
    pequeñas vs. bolsas grandes, ambas en "kg").
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
    for p in productions:
        local_dt = to_local(p.fecha)
        d = local_dt.date()
        for prod in p.productos:
            nombre = normalizar_nombre(prod.nombre)
            entries_por_dia[d][nombre] += 1
            qty_por_producto[nombre] += float(prod.cantidad or 0)
            dias_por_producto[nombre].add(d)
            unidad_por_producto[nombre] = normalizar_unidad(prod.unidad)
    return entries_por_dia, qty_por_producto, dias_por_producto, unidad_por_producto


def _compute_rate_by_product_for_month(operator_id: int, year: int, month: int):
    entries_por_dia, qty_por_producto, dias_por_producto, unidad_por_producto = _entries_por_dia_y_producto(
        operator_id, year, month
    )
    if not entries_por_dia:
        return {}

    horas_otras_por_dia = _otras_horas_por_dia(operator_id, year, month)

    horas_por_producto = defaultdict(float)
    for d, productos_dia in entries_por_dia.items():
        base = horas_programadas(d)
        otras = horas_otras_por_dia.get(d, 0.0)
        horas_efectivas_dia = max(base - otras, 0.0)
        total_entries_dia = sum(productos_dia.values())
        if total_entries_dia == 0:
            continue
        for nombre, n in productos_dia.items():
            horas_por_producto[nombre] += horas_efectivas_dia * (n / total_entries_dia)

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

UMBRALES = [
    (1.15, "muy_alta", True),
    (1.00, "alta", True),
    (0.85, "regular", False),
    (0.65, "baja", False),
    (0.0,  "muy_baja", False),
]

# Techo razonable para el ratio mostrado: evita que un mes con muy pocas
# horas registradas dispare un porcentaje sin sentido en el gráfico.
RATIO_MAX = 3.0
# Días mínimos trabajados en el mes EN CURSO antes de confiar en su
# clasificación (evita mostrar una nota engañosa a inicios de mes).
MIN_DIAS_MES_ACTUAL = 1


def clasificar(ratio):
    if ratio is None:
        return "sin_datos", False
    for limite, etiqueta, bono in UMBRALES:
        if ratio >= limite:
            return etiqueta, bono
    return "muy_baja", False


def evaluar_operador(operator_id: int, year: int, month: int):
    por_producto = rate_by_product_for_month(operator_id, year, month)

    detalle = []
    suma_ratio_ponderada = 0.0
    peso_total = 0.0
    horas_totales = 0.0

    for nombre, data in por_producto.items():
        if data["rate"] is None:
            continue

        # Prioridad de comparación, de más a menos confiable:
        #   1. Histórico GLOBAL del producto en meses ANTERIORES (todos los
        #      operarios que lo hayan fabricado) — la referencia más sólida.
        #   2. Compañeros que fabrican el MISMO producto en el MISMO mes
        #      actual — cuando el producto es nuevo y aún no hay meses
        #      anteriores, esto permite distinguir en tiempo real a un
        #      operario que produjo mucho de otro que produjo poco del
        #      mismo producto el mismo día, en vez de darles a ambos 100%
        #      por falta de referencia.
        #   3. Historial propio del operario en meses anteriores.
        #   4. Su propia tasa actual (solo si es literalmente el primer
        #      registro de este producto en todo el sistema).
        baseline = baseline_global_product(nombre, year, month)
        if baseline is not None:
            fuente = "producto"
        else:
            baseline = baseline_peers_current_month(nombre, year, month, operator_id)
            if baseline is not None:
                fuente = "pares_mes"
            else:
                baseline = baseline_for_operator_product(operator_id, year, month, nombre)
                if baseline is not None:
                    fuente = "historica"
                else:
                    baseline = data["rate"]
                    fuente = "inicial"

        ratio_producto = (data["rate"] / baseline) if baseline else None
        detalle.append({
            "nombre": nombre,
            "unidad": data["unidad"],
            "cantidad": round(data["qty"], 2),
            "horas": round(data["horas"], 2),
            "produccion_por_hora": round(data["rate"], 3),
            "linea_base": round(baseline, 3) if baseline else None,
            "linea_base_fuente": fuente,
            "ratio": round(ratio_producto, 3) if ratio_producto is not None else None,
        })

        if ratio_producto is not None:
            peso = data["horas"] or 0.0001  # evita división por peso cero en casos límite
            suma_ratio_ponderada += ratio_producto * peso
            peso_total += peso

        horas_totales += data["horas"]

    _, _, dias_por_producto, _ = _entries_por_dia_y_producto(operator_id, year, month)
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
        "ratio": round(ratio, 3) if ratio is not None else None,
        "clasificacion": etiqueta,
        "bono": bono,
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
    entries_por_dia, qty_por_producto, dias_por_producto, unidad_por_producto = _entries_por_dia_y_producto(
        operator_id, year, month
    )

    qty_por_dia_producto = defaultdict(lambda: defaultdict(float))
    for d, productos_dia in entries_por_dia.items():
        pass  # entries_por_dia solo cuenta líneas, no cantidad; se recalcula abajo

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

    horas_otras_por_dia = _otras_horas_por_dia(operator_id, year, month)
    por_producto = rate_by_product_for_month(operator_id, year, month)
    principal = max(por_producto.items(), key=lambda kv: kv[1]["horas"])[0] if por_producto else None

    resultado = []
    for d in sorted(qty_por_dia_producto.keys()):
        base = horas_programadas(d)
        otras = horas_otras_por_dia.get(d, 0.0)
        horas_efectivas_dia = max(base - otras, 0.0)
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