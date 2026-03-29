from flask import current_app
from flask_mail import Message
from app import mail

def send_recovery_code(email: str, code: str) -> None:
    _send(
        subject="Código de recuperación",
        recipients=[email],
        body=f"Tu código de recuperación es: {code}",
    )

def send_update_code(email: str, code: str) -> None:
    _send(
        subject="Confirma actualización de perfil",
        recipients=[email],
        body=f"Tu código para confirmar la actualización de tu perfil es: {code}",
    )

def _send(subject: str, recipients: list[str], body: str) -> None:
    """
    Envía correo usando la config actual.
    Loggea errores y vuelve a lanzar para que la ruta responda 500 con JSON.
    """
    sender = current_app.config.get("MAIL_DEFAULT_SENDER") or current_app.config.get("MAIL_USERNAME")
    try:
        msg = Message(subject=subject, recipients=recipients, body=body, sender=sender)
        mail.send(msg)
        current_app.logger.info(f"[MAIL] OK -> {recipients}")
    except Exception as e:
        # No imprimas credenciales, solo el error
        current_app.logger.exception(f"[MAIL] ERROR -> {recipients}: {e}")
        raise