from app import db
from app.models.notification_model import Notification
from app.models.user_model import User


def create_notification(user_id, type_: str, title: str, body: str, meta: dict | None = None):
    """Crea una notificación in-app para un usuario. No envía correo."""
    if not user_id:
        return None
    try:
        uid = int(user_id)
    except (TypeError, ValueError):
        return None
    user = User.query.get(uid)
    if not user:
        return None
    n = Notification(
        user_id=uid,
        type=type_,
        title=title[:200],
        body=body,
        meta=meta or {},
        is_read=False,
    )
    db.session.add(n)
    return n


def notify_dispatch_edit(dispatch, created_by_id, changes: list[str], edited_by_name: str | None = None):
    """
    changes: lista de strings legibles, ej:
      - "la OC cambió de '12345' a '123456'"
      - "el Centro de Costo cambió de 'CMPC' a 'Salco Brand'"
      - ...
    Notifica siempre al creador del despacho, aunque se haya editado a sí mismo.
    """
    if not changes or not created_by_id:
        return
    oc = dispatch.orden or "—"
    cliente = dispatch.client_name or "—"
    cambios_txt = "; ".join(changes)
    title = f"Tu despacho OC {oc} fue corregido"
    body = (
        f"Tu despacho con OC: {oc} del Centro de Costo: {cliente} "
        f"fue editado. Cambios: {cambios_txt}. "
        f"Revisa el detalle para entender qué se corrigió. "
        f"Sé más atento al ingresar despachos: los errores en productos afectan el stock "
        f"y los números de OC / nombres de clientes dificultan la trazabilidad y la búsqueda."
    )
    if edited_by_name:
        body += f" (Corregido por: {edited_by_name})"
    create_notification(
        created_by_id,
        "dispatch_edit",
        title,
        body,
        meta={
            "dispatch_id": dispatch.id,
            "orden": oc,
            "cliente": cliente,
            "changes": changes,
        },
    )