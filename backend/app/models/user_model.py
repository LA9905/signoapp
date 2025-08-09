from app import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    recovery_code = db.Column(db.String(6), nullable=True)
    # NUEVOS:
    avatar_url = db.Column(db.String(255), nullable=True)
    update_code = db.Column(db.String(6), nullable=True)  # código para confirmar edición de perfil

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)