# app/utils/billing.py
from datetime import date
from typing import Optional

def _cutoff_for_month(today: date, due_day: Optional[int]) -> date:
    """Retorna la fecha de corte del MES ACTUAL (día due_day)."""
    d = int(due_day or 8)
    # si due_day es inválido, fuerza 8
    if d < 1 or d > 28:
        d = 8
    return date(today.year, today.month, d)

def is_blocked(user, today: Optional[date] = None) -> bool:
    """
    Regla:
      - Se bloquea si HOY >= día de corte (8 por defecto)
      - y NO hay pago cubriendo al menos hasta esa fecha de corte.
    Requiere que 'user' tenga: due_day (int|None) y subscription_paid_until (date|None).
    """
    if user is None:
        return True

    today = today or date.today()
    cutoff = _cutoff_for_month(today, getattr(user, "due_day", 8))

    paid_until = getattr(user, "subscription_paid_until", None)
    # Si hoy aún NO llega a la fecha de corte, no bloquear.
    if today < cutoff:
        return False

    # Si no hay pago registrado o pago es anterior a cutoff => bloquear.
    if paid_until is None:
        return True

    return paid_until < cutoff