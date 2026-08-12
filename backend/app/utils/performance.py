from datetime import date
from collections import defaultdict
from sqlalchemy import extract
from app import db
from app.models.production_model import Production, ProductionProduct
from app.models.operator_activity_model import OperatorActivity
from app.models.operator_model import Operator
from app.utils.timezone import to_local

# ── Horario laboral efectivo (ya descontada 1h de colación) ─────────────────
def horas_programadas(d: date) -> float:
    wd = d.weekday()  # 0=lunes ... 6=domingo
    if wd <= 3:        # Lunes a Jueves: 7:30-16:00 (8.5h) - 1h colación
        return 7.5
    elif wd == 4:       # Viernes: 7:00-15:00 (8h) - 1h colación
        return 7.0
    return 0.0


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


def _entries_por_dia_y_unidad(operator_id: int, year: int, month: int):
    """
    Recorre las producciones del mes y arma, por día, cuántas líneas de
    producto hay por unidad (para repartir las horas proporcionalmente),
    más la cantidad total y los días trabajados por cada unidad.
    """
    productions = Production.query.filter(Production.operator_id == operator_id).all()
    entries_por_dia = defaultdict(lambda: defaultdict(int))
    qty_por_unidad = defaultdict(float)
    dias_por_unidad = defaultdict(set)
    for p in productions:
        local_dt = to_local(p.fecha)
        if local_dt.year != year or local_dt.month != month:
            continue
        d = local_dt.date()
        for prod in p.productos:
            u = prod.unidad
            entries_por_dia[d][u] += 1
            qty_por_unidad[u] += float(prod.cantidad or 0)
            dias_por_unidad[u].add(d)
    return entries_por_dia, qty_por_unidad, dias_por_unidad


def rate_by_unit_for_month(operator_id: int, year: int, month: int):
    """
    Tasa de producción por hora, calculada POR UNIDAD (no una sola para
    todo el mes). Las horas efectivas de cada día se reparten entre las
    unidades que el operario trabajó ese día, proporcional a cuántas
    líneas de producto registró de cada una.
    Devuelve {unidad: {"qty", "dias", "horas", "rate"}}.
    """
    entries_por_dia, qty_por_unidad, dias_por_unidad = _entries_por_dia_y_unidad(operator_id, year, month)
    if not entries_por_dia:
        return {}

    horas_otras_por_dia = _otras_horas_por_dia(operator_id, year, month)

    horas_por_unidad = defaultdict(float)
    for d, unidades_dia in entries_por_dia.items():
        base = horas_programadas(d)
        otras = horas_otras_por_dia.get(d, 0.0)
        horas_efectivas_dia = max(base - otras, 0.0)
        total_entries_dia = sum(unidades_dia.values())
        if total_entries_dia == 0:
            continue
        for u, n in unidades_dia.items():
            horas_por_unidad[u] += horas_efectivas_dia * (n / total_entries_dia)

    resultado = {}
    for u in qty_por_unidad:
        horas = horas_por_unidad.get(u, 0.0)
        qty = qty_por_unidad[u]
        dias = len(dias_por_unidad[u])
        rate = (qty / horas) if horas > 0 else None
        resultado[u] = {"qty": qty, "dias": dias, "horas": horas, "rate": rate}
    return resultado


def baseline_for_operator_unit(operator_id: int, year: int, month: int, unidad: str, n_meses: int = 6):
    """
    Mediana de la tasa de esa unidad específica en los últimos n_meses
    meses COMPLETOS anteriores al mes evaluado (>=10 días trabajados
    en esa unidad).
    """
    rates = []
    y, m = year, month
    checked = 0
    while checked < 12 and len(rates) < n_meses:
        m -= 1
        if m == 0:
            m, y = 12, y - 1
        checked += 1
        data = rate_by_unit_for_month(operator_id, y, m).get(unidad)
        if data and data["rate"] is not None and data["dias"] >= 10:
            rates.append(data["rate"])
    if not rates:
        return None
    rates.sort()
    mid = len(rates) // 2
    if len(rates) % 2 == 1:
        return rates[mid]
    return (rates[mid - 1] + rates[mid]) / 2


def baseline_equipo_unit(year: int, month: int, unidad: str, exclude_operator_id: int = None, min_dias: int = 1):
    """
    Fallback: mediana de la tasa del resto del equipo en esa misma unidad
    y mes, para operarios sin 6 meses de historial propio en esa unidad.
    """
    rates = []
    for op in Operator.query.all():
        if exclude_operator_id and op.id == exclude_operator_id:
            continue
        data = rate_by_unit_for_month(op.id, year, month).get(unidad)
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


def clasificar(ratio):
    if ratio is None:
        return "sin_datos", False
    for limite, etiqueta, bono in UMBRALES:
        if ratio >= limite:
            return etiqueta, bono
    return "muy_baja", False


def evaluar_operador(operator_id: int, year: int, month: int):
    por_unidad = rate_by_unit_for_month(operator_id, year, month)

    detalle = []
    suma_ratio_ponderada = 0.0
    peso_total = 0.0
    horas_totales = 0.0

    for unidad, data in por_unidad.items():
        if data["rate"] is None:
            continue

        baseline = baseline_for_operator_unit(operator_id, year, month, unidad)
        fuente = "historica"
        if baseline is None:
            baseline = baseline_equipo_unit(year, month, unidad, exclude_operator_id=operator_id)
            fuente = "equipo"
        if baseline is None:
            baseline = data["rate"]
            fuente = "inicial"

        ratio_unidad = (data["rate"] / baseline) if baseline else None
        detalle.append({
            "unidad": unidad,
            "cantidad": round(data["qty"], 2),
            "horas": round(data["horas"], 2),
            "produccion_por_hora": round(data["rate"], 3),
            "linea_base": round(baseline, 3) if baseline else None,
            "linea_base_fuente": fuente,
            "ratio": round(ratio_unidad, 3) if ratio_unidad is not None else None,
        })

        if ratio_unidad is not None:
            peso = data["horas"] or 0.0001  # evita división por peso cero en casos límite
            suma_ratio_ponderada += ratio_unidad * peso
            peso_total += peso

        horas_totales += data["horas"]

    _, _, dias_por_unidad = _entries_por_dia_y_unidad(operator_id, year, month)
    dias_totales = set()
    for dias_u in dias_por_unidad.values():
        dias_totales |= dias_u

    ratio = (suma_ratio_ponderada / peso_total) if peso_total > 0 else None
    etiqueta, bono = clasificar(ratio)

    hoy = date.today()
    mes_en_curso = (year == hoy.year and month == hoy.month)

    principal = max(por_unidad.items(), key=lambda kv: kv[1]["horas"])[0] if por_unidad else None
    principal_data = por_unidad.get(principal) if principal else None
    principal_detalle = next((d for d in detalle if d["unidad"] == principal), None)

    return {
        "unidad": principal,
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