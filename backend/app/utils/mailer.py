from flask_mail import Message
from app import mail

def send_recovery_code(email, code):
    msg = Message("Código de recuperación", recipients=[email])
    msg.body = f"Tu código de recuperación es: {code}"
    mail.send(msg)

def send_update_code(email, code):
    msg = Message("Confirma actualización de perfil", recipients=[email])
    msg.body = f"Tu código para confirmar la actualización de tu perfil es: {code}"
    mail.send(msg)