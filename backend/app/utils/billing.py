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
    Reglas:
    - Si el usuario NO tiene subscription_paid_until → bloqueado inmediatamente (usuarios nuevos).
    - Bloqueado solo si la fecha actual >= día de corte del mes actual Y subscription_paid_until < corte del mes actual.
    - Esto permite un período de gracia del 1 al 7 (o hasta due_day-1), y bloquea a partir del due_day si no se marcó el pago.
    - El día de corte es configurable por usuario (default 8).
    - Funciona aunque hoy sea día 1, 5 o 20 del mes.
    """
    if user is None:
        return True

    today = today or date.today()
    due_day = int(getattr(user, "due_day", 8) or 8)
    if due_day < 1 or due_day > 28:
        due_day = 8

    # Fecha de corte los 8 de cada MES
    cutoff_this_month = date(today.year, today.month, due_day)

    paid_until = getattr(user, "subscription_paid_until", None)

    # Si nunca ha pagado → bloqueado (usuarios recien creados bloqueados)
    if paid_until is None:
        return True

    # Bloqueado solo a partir del día de corte si el pago no cubre el mes actual
    return today >= cutoff_this_month and paid_until < cutoff_this_month