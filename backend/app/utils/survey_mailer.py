from flask import current_app
from flask_mail import Message
from app import mail
import uuid

SURVEY_SENDER = ("SignoApp - Encuesta", "acceso.signoapp@gmail.com")
REPLY_TO = "acceso.signoapp@gmail.com"


def send_survey_email(to_email: str, user_name: str | None = None, token: str | None = None):
    if not token:
        token = str(uuid.uuid4())
    survey_url = f"https://api.signo-app.com/encuesta/{token}"

    subject = "Tu opinión nos importa – Encuesta de satisfacción SignoApp"
    greeting = f"Hola, {user_name}" if user_name else "Hola"

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #333;">
        <h2 style="color: #1e40af;">¡Gracias por usar SignoApp!</h2>
        <p>{greeting},</p>
        <p><strong>Tu opinión es fundamental</strong> para seguir mejorando.</p>
        <p>Te invitamos a responder esta breve encuesta (menos de 3 minutos).</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{survey_url}"
               style="background: #1e40af; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Responder Encuesta
            </a>
        </div>
        <p><small>Si el botón no funciona, copia este enlace:<br>
        <a href="{survey_url}">{survey_url}</a></small></p>
    </div>
    """
    msg = Message(
        subject=subject,
        recipients=[to_email],
        html=html,
        sender=SURVEY_SENDER,
        reply_to=REPLY_TO,
    )
    try:
        mail.send(msg)
        current_app.logger.info(f"[ENCUESTA] Enviada a {to_email}")
        return token
    except Exception as e:
        current_app.logger.error(f"[ENCUESTA] Error enviando a {to_email}: {e}")
        raise


def send_survey_reminder(to_email, user_name, token, is_anniversary, year_number):
    survey_url = f"https://api.signo-app.com/encuesta/{token}"
    if is_anniversary:
        subject = f"Tu opinión del año {year_number} en SignoApp"
        blurb = "Tras el primer año de uso, nos importa mucho tu feedback."
    else:
        subject = "Encuesta de satisfacción – SignoApp"
        blurb = "Tu opinión nos ayuda a mejorar SignoApp."

    greeting = f"Hola, {user_name}" if user_name else "Hola"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #333;">
        <h2 style="color: #1e40af;">Recordatorio – Encuesta SignoApp</h2>
        <p>{greeting},</p>
        <p>{blurb}</p>
        <p>Si aún no respondiste, te invitamos a hacerlo (menos de 3 minutos).</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{survey_url}"
               style="background: #1e40af; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Responder Encuesta
            </a>
        </div>
        <p><small><a href="{survey_url}">{survey_url}</a></small></p>
    </div>
    """
    msg = Message(
        subject=subject,
        recipients=[to_email],
        html=html,
        sender=SURVEY_SENDER,
        reply_to=REPLY_TO,
    )
    try:
        mail.send(msg)
        current_app.logger.info(f"[ENCUESTA] Recordatorio a {to_email}")
    except Exception as e:
        current_app.logger.error(f"[ENCUESTA] Error recordatorio a {to_email}: {e}")
        raise