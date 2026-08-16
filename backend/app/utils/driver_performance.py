from datetime import date, datetime, timedelta
from calendar import monthrange
from collections import defaultdict
from sqlalchemy import func
from app.models.dispatch_model import Dispatch
from app.models.driver_model import Driver
from app.utils.timezone import to_utc_naive, to_local, CL_TZ

# Choferes que NO se evalúan (retiros de cliente, encomiendas, transportistas
# externos, etc. — no siguen una ruta propia de la empresa que se pueda medir).
EXCLUDED_DRIVER_NAMES = {
    "retira cliente",
    "encomienda",
    "pelicano",
    "don luis mendez",
    "don cesar mendez",
    "luis miguel mendez",
    "encomienda",
    "fernando chalbaud"
    }


def _normalizar_nombre(n: str) -> str:
    return " ".join((n or "").strip().split()).lower()


def is_evaluable_driver(name: str) -> bool:
    return _normalizar_nombre(name) not in EXCLUDED_DRIVER_NAMES


# Mapeo de correos de usuarios "chofer" (acceso limitado) al nombre EXACTO
# del chofer correspondiente en la tabla Driver. Se usa para que estos
# usuarios vean en su propio Dashboard las métricas de SU rendimiento
# como chofer.
LIMITED_USER_DRIVER_EMAIL_MAP = {
    "alfonsomachado64@gmail.com": "Alfonso Machado",
    "cocachaucono@gmail.com": "José Chaucono",
    "jerrykalet@gmail.com": "Fernando Terrones",
    "claudiogarbarino1966@gmail.com": "Claudio Garbarino",
}


def get_driver_for_user_email(email: str):
    """Devuelve el Driver asociado a un correo de usuario limitado (chofer),
    o None si el correo no está mapeado o el chofer no existe en la tabla."""
    driver_name = LIMITED_USER_DRIVER_EMAIL_MAP.get((email or "").strip().lower())
    if not driver_name:
        return None
    return Driver.query.filter(func.lower(Driver.name) == driver_name.lower()).first()


def _month_utc_bounds(year: int, month: int):
    first_local = datetime(year, month, 1, 0, 0, 0, tzinfo=CL_TZ)
    last_day = monthrange(year, month)[1]
    next_month_local = datetime(year, month, last_day, 0, 0, 0, tzinfo=CL_TZ) + timedelta(days=1)
    return to_utc_naive(first_local), to_utc_naive(next_month_local)


# Umbrales de la tasa de cumplimiento (entregados / total asignado).
UMBRALES = [
    (0.95, "excelente"),
    (0.85, "buena"),
    (0.70, "regular"),
    (0.50, "baja"),
    (0.0,  "muy_baja"),
]


def clasificar(ratio):
    if ratio is None:
        return "sin_datos"
    for limite, etiqueta in UMBRALES:
        if ratio >= limite:
            return etiqueta
    return "muy_baja"


def evaluar_chofer(driver_id: int, year: int, month: int):
    start_utc, end_utc = _month_utc_bounds(year, month)
    dispatches = (
        Dispatch.query
        .filter(Dispatch.chofer_id == driver_id)
        .filter(Dispatch.fecha >= start_utc, Dispatch.fecha < end_utc)
        .all()
    )
    total = len(dispatches)
    entregados = sum(1 for d in dispatches if d.delivered_client)
    pendientes = total - entregados
    ratio = (entregados / total) if total > 0 else None
    etiqueta = clasificar(ratio)

    hoy = date.today()
    mes_en_curso = (year == hoy.year and month == hoy.month)

    return {
        "total_despachos": total,
        "entregados": entregados,
        "pendientes": pendientes,
        "ratio": round(ratio, 3) if ratio is not None else None,
        "clasificacion": etiqueta,
        "sujeto_sancion": etiqueta in ("baja", "muy_baja"),
        "mes_en_curso": mes_en_curso,
    }

def daily_detail_for_driver(driver_id: int, year: int, month: int):
    """
    Desglose día a día del mes: cuántos despachos fueron asignados al chofer
    cada día y cuántos de esos quedaron marcados como entregados al cliente
    (vs. cuántos siguen sin marcar). Usado por el detalle del chofer para
    mostrar los picos de despachos por fecha, distinguiendo marcados de
    sin marcar.
    """
    start_utc, end_utc = _month_utc_bounds(year, month)
    dispatches = (
        Dispatch.query
        .filter(Dispatch.chofer_id == driver_id)
        .filter(Dispatch.fecha >= start_utc, Dispatch.fecha < end_utc)
        .all()
    )

    por_dia = defaultdict(lambda: {"total": 0, "marcados": 0, "sin_marcar": 0})
    for d in dispatches:
        fecha = to_local(d.fecha).date()
        por_dia[fecha]["total"] += 1
        if d.delivered_client:
            por_dia[fecha]["marcados"] += 1
        else:
            por_dia[fecha]["sin_marcar"] += 1

    resultado = []
    for fecha in sorted(por_dia.keys()):
        v = por_dia[fecha]
        resultado.append({
            "fecha": fecha.isoformat(),
            "total_despachos": v["total"],
            "marcados": v["marcados"],
            "sin_marcar": v["sin_marcar"],
        })
    return resultado