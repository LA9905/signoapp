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
      - "el producto 'X' cambió de cantidad..."
      - "se agregó el producto..."
      - "se eliminó el producto..."
      - "el chofer cambió de 'A' a 'B'"
    Notifica siempre al creador del despacho, aunque se haya editado a sí mismo.
    """
    if not changes or not created_by_id:
        return

    oc = dispatch.orden or "—"
    cliente = dispatch.client_name or "—"
    cambios_txt = "; ".join(changes)

    joined = " ".join(changes).lower()
    has_oc = "la oc cambió" in joined or "oc cambió" in joined
    has_cliente = "centro de costo" in joined
    has_productos = (
        "producto" in joined
        or "se agregó" in joined
        or "se eliminó" in joined
    )
    has_chofer = "chofer" in joined

    exhortaciones = []
    if has_productos:
        exhortaciones.append(
            "los errores en productos afectan el stock y la trazabilidad del inventario"
        )
    if has_oc:
        exhortaciones.append(
            "un número de OC incorrecto dificulta la búsqueda y el seguimiento del pedido"
        )
    if has_cliente:
        exhortaciones.append(
            "un nombre de Centro de Costo incorrecto complica la trazabilidad y la búsqueda"
        )
    if has_chofer:
        exhortaciones.append(
            "asignar el chofer correcto evita confusiones en la ruta y en el marcado de entregas"
        )

    if len(exhortaciones) == 1:
        exhort_txt = f"Sé más atento al ingresar despachos: {exhortaciones[0]}."
    elif len(exhortaciones) > 1:
        # Varios tipos de error: unir con " y " / comas
        if len(exhortaciones) == 2:
            joined_ex = f"{exhortaciones[0]} y {exhortaciones[1]}"
        else:
            joined_ex = (
                ", ".join(exhortaciones[:-1]) + f" y {exhortaciones[-1]}"
            )
        exhort_txt = f"Sé más atento al ingresar despachos: {joined_ex}."
    else:
        exhort_txt = "Sé más atento al ingresar los datos del despacho."

    title = f"Tu despacho OC {oc} fue corregido"
    body = (
        f"Tu despacho con OC: {oc} del Centro de Costo: {cliente} "
        f"fue editado. Cambios: {cambios_txt}. "
        f"Revisa el detalle para entender qué se corrigió. "
        f"{exhort_txt}"
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