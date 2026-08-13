from datetime import date, datetime, timedelta
from calendar import monthrange
from app.models.dispatch_model import Dispatch
from app.models.driver_model import Driver
from app.utils.timezone import to_utc_naive, CL_TZ

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