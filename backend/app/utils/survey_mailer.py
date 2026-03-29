from flask import current_app, url_for
from flask_mail import Message
from app import mail
from datetime import datetime
from zoneinfo import ZoneInfo
import uuid

# Configuración del remitente de la encuesta (usa el de notificaciones para no el de recuperación)
SURVEY_SENDER = ("SignoApp - Encuesta", "acceso.signoapp@gmail.com")
REPLY_TO = "acceso.signoapp@gmail.com"  # Aquí llegan todas las respuestas

def send_survey_email(to_email: str, user_name: str | None = None):
    token = str(uuid.uuid4())
    survey_url = f"https://api.signo-app.com/encuesta/{token}"
    #survey_url = f"http://localhost:5000/encuesta/{token}"  # ← solo para pruebas locales

    subject = "Tu opinión nos importa – Encuesta de satisfacción SignoApp"

    greeting = f"Hola{f', {user_name}' if user_name else ''}" if user_name else "Hola"

    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; color: #333;">
        <h2 style="color: #1e40af;">¡Gracias por usar SignoApp!</h2>
        <p>{greeting},</p>
        <p>Durante estos primeros meses hemos trabajado duro para que SignoApp sea la mejor herramienta para tu empresa.</p>
        <p><strong>Tu opinión es fundamental</strong> para seguir mejorando.</p>
        <p>Por eso te invitamos a responder esta breve encuesta (menos de 3 minutos). Tus respuestas son <strong>100% confidenciales</strong> y puedes responder de forma <strong>completamente anónima</strong> si lo prefieres.</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{survey_url}" 
               style="background: #1e40af; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Responder Encuesta
            </a>
        </div>

        <p><small>Si el botón no funciona, copia este enlace:<br>
        <a href="{survey_url}">{survey_url}</a></small></p>

        <hr style="margin: 30px 0; border: 1px solid #eee;">
        <p style="font-size: 13px; color: #666;">
            Esta encuesta fue enviada automáticamente. Las respuestas se reciben en acceso.signoapp@gmail.com.<br>
            Si no deseas recibir más encuestas futuras, puedes <a href="{{unsubscribe_url}}">desuscribirte aquí</a>.
        </p>
    </div>
    """

    msg = Message(
        subject=subject,
        recipients=[to_email],
        html=html,
        sender=SURVEY_SENDER,
        reply_to=REPLY_TO
    )

    try:
        mail.send(msg)
        current_app.logger.info(f"[ENCUESTA] Enviada a {to_email}")
    except Exception as e:
        current_app.logger.error(f"[ENCUESTA] Error enviando a {to_email}: {e}")
        raise