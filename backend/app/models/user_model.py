from app import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import date

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    recovery_code = db.Column(db.String(6), nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)
    update_code = db.Column(db.String(6), nullable=True)  # código para confirmar edición de perfil
    is_admin = db.Column(db.Boolean, nullable=False, default=False)
    subscription_paid_until = db.Column(db.Date, nullable=True)  # última fecha cubierta (ej.: 2025-09-08)
    due_day = db.Column(db.Integer, nullable=False, default=8)   # día de corte (8)
    receive_notifications = db.Column(db.Boolean, nullable=False, default=True)  # Suscripción a notificaciones


    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)