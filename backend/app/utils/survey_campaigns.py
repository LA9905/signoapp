"""Campañas de encuesta cada 6 meses. Primera: 2026-10-01 (post aniversario 9/sep año 1)."""
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

CL = ZoneInfo("America/Santiago")

# Primera campaña activa
FIRST_START = date(2026, 10, 1)
CAMPAIGN_DAYS = 30          # modal + correos
EMAIL_EVERY_DAYS = 4        # recordatorio correo
ANNIVERSARY_MONTH = 9       # aniversario app: 9 de septiembre


def campaign_key_for(start: date) -> str:
    return f"{start.year}-{start.month:02d}"


def is_anniversary_campaign(start: date) -> bool:
    """Octubre (tras el 9/sep) = tono aniversario; abril = encuesta normal."""
    return start.month == 10


def active_campaign(today: date | None = None) -> dict | None:
    """Devuelve campaña activa o None."""
    today = today or datetime.now(CL).date()
    if today < FIRST_START:
        return None

    # Generar inicios cada 6 meses desde FIRST_START
    start = FIRST_START
    # Avanzar hasta el periodo que cubre `today`
    while True:
        end = start + timedelta(days=CAMPAIGN_DAYS - 1)
        if start <= today <= end:
            return {
                "key": campaign_key_for(start),
                "start": start,
                "end": end,
                "is_anniversary": is_anniversary_campaign(start),
                "year_number": max(1, start.year - 2025),  # 2026 → año 1 de uso aprox.
            }
        next_start = date(start.year + (1 if start.month + 6 > 12 else 0),
                          ((start.month - 1 + 6) % 12) + 1, 1)
        if next_start > today + timedelta(days=400):
            return None
        if next_start > today:
            return None
        start = next_start


def days_since_start(camp: dict, today: date | None = None) -> int:
    today = today or datetime.now(CL).date()
    return (today - camp["start"]).days