# start.py
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token
from flask_mail import Mail, Message
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import random
import os

# Cargar variables de entorno
load_dotenv()

# Inicializar aplicación Flask
app = Flask(__name__)

# Configuración de CORS para permitir todos los orígenes, métodos y encabezados
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Authorization", "Content-Type"]}}, supports_credentials=True)

# Configuración
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

# Extensiones
db = SQLAlchemy(app)
jwt = JWTManager(app)
mail = Mail(app)

# Manejar errores de JWT
@jwt.unauthorized_loader
def unauthorized_callback(callback):
    return jsonify({"msg": "Token inválido o no proporcionado"}), 401

# Manejar errores generales de Flask
@app.errorhandler(Exception)
def handle_exception(e):
    print(f"Error global: {str(e)}")
    return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

# Modelos
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    recovery_code = db.Column(db.String(6), nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# Crear tablas
with app.app_context():
    db.create_all()

# Registrar Blueprints
from app.routes.product_routes import product_bp
app.register_blueprint(product_bp, url_prefix="/api")

# Depuración antes de procesar la solicitud
@app.before_request
def log_request_info():
    print(f"Ruta solicitada: {request.path}")
    print(f"Método: {request.method}")
    print(f"Headers: {request.headers}")
    if request.method in ['POST', 'PUT', 'PATCH']:
        print(f"Raw data recibido: {request.get_data(as_text=True)}")  # Loguear datos crudos
        try:
            print(f"JSON recibido: {request.get_json()}")
        except Exception as e:
            print(f"Error al parsear JSON: {str(e)}")

# Manejar solicitudes OPTIONS para CORS
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Rutas de autenticación
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"msg": "Ya existe un usuario con ese correo"}), 400
    user = User(name=data["name"], email=data["email"])
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    return jsonify({"msg": "Usuario registrado correctamente"})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data["email"]).first()
    if not user or not user.check_password(data["password"]):
        return jsonify({"msg": "Credenciales inválidas"}), 401
    token = create_access_token(identity=user.id)
    return jsonify({"token": token, "name": user.name})

@app.route("/api/auth/recover", methods=["POST"])
def recover():
    data = request.json
    user = User.query.filter_by(email=data["email"]).first()
    if not user:
        return jsonify({"msg": "Correo no registrado"}), 404
    code = str(random.randint(100000, 999999))
    user.recovery_code = code
    db.session.commit()
    msg = Message(subject="Código de recuperación", recipients=[user.email])
    msg.body = f"Tu código de recuperación es: {code}"
    mail.send(msg)
    return jsonify({"msg": "Código enviado al correo"})

@app.route("/api/auth/reset-password", methods=["POST"])
def reset_password():
    data = request.json
    user = User.query.filter_by(email=data["email"]).first()
    if not user or user.recovery_code != data["code"]:
        return jsonify({"msg": "Código inválido"}), 400
    user.set_password(data["new_password"])
    user.recovery_code = None
    db.session.commit()
    return jsonify({"msg": "Contraseña actualizada correctamente"})

# Ejecutar servidor
if __name__ == "__main__":
    app.run(debug=True)