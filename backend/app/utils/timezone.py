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
    Si dt es naive, se asume que está en UTC (ya que los datos nuevos se almacenan como UTC naive).
    """
    if dt is None:
        return dt

    # Si ya es aware → convertir directo
    if dt.tzinfo is not None:
        return dt.astimezone(CL_TZ)

    # Para naive: asumir UTC y convertir a local
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