import os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

TZ_NAME = os.getenv("APP_TZ", "America/Santiago")
CL_TZ = ZoneInfo(TZ_NAME)
UTC = ZoneInfo("UTC")

def utcnow():
    return datetime.now(timezone.utc)

def to_local(dt: datetime) -> datetime:
    """
    Convierte a hora local de Chile.
    Si dt es naive, detecta heurísticamente si está en local o en UTC
    (útil mientras conviven datos históricos grabados de ambas formas).
    """
    if dt is None:
        return dt

    # Si ya es aware → convertir directo
    if dt.tzinfo is not None:
        return dt.astimezone(CL_TZ)

    # Heurística para naive:
    # Comparamos qué interpretación (UTC vs Local) queda más “cerca” del ahora.
    now_local = datetime.now(CL_TZ).replace(tzinfo=None)
    now_utc   = datetime.utcnow().replace(tzinfo=None)

    # Distancias absolutas en segundos
    diff_as_local = abs((dt - now_local).total_seconds())
    diff_as_utc   = abs((dt - now_utc).total_seconds())

    # Margen de 30 minutos para evitar falsos positivos
    if diff_as_local + 1800 < diff_as_utc:
        # Parece ya en hora local → solo “poner” la zona
        return dt.replace(tzinfo=CL_TZ)
    else:
        # Parece UTC → convertir a local
        return dt.replace(tzinfo=UTC).astimezone(CL_TZ)

def month_start_local_now() -> datetime:
    now_local = datetime.now(CL_TZ)
    return now_local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

def to_utc_naive(dt: datetime) -> datetime:
    """
    Devuelve dt en UTC naive (para columnas 'timestamp without time zone').
    Si dt es naive, se asume que está en hora local y se pasa a UTC.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=CL_TZ).astimezone(UTC)
    else:
        dt = dt.astimezone(UTC)
    return dt.replace(tzinfo=None)