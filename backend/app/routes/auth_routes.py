from flask import Blueprint, request, jsonify
from .. import db
from ..models import User
from flask_jwt_extended import create_access_token
import random
from ..utils.mailer import send_recovery_code


auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json
    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"msg": "Ya existe un usuario con ese correo"}), 400

    user = User(name=data["name"], email=data["email"])
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()

    return jsonify({"msg": "Usuario registrado correctamente"})

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    user = User.query.filter_by(email=data["email"]).first()
    if not user or not user.check_password(data["password"]):
        return jsonify({"msg": "Credenciales inválidas"}), 401

    token = create_access_token(identity=str(user.id))  # Convertir a cadena
    return jsonify({"token": token, "name": user.name})

@auth_bp.route("/recover", methods=["POST"])
def recover():
    print("📨 ENTRANDO A recover (envía correo)")

    data = request.json
    user = User.query.filter_by(email=data["email"]).first()
    if not user:
        return jsonify({"msg": "Correo no registrado"}), 404

    code = str(random.randint(100000, 999999))
    user.recovery_code = code
    db.session.commit()

    send_recovery_code(user.email, code)
    return jsonify({"msg": "Código enviado al correo"})

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.json
    user = User.query.filter_by(email=data["email"]).first()
    if not user or user.recovery_code != data["code"]:
        return jsonify({"msg": "Código inválido"}), 400

    user.set_password(data["new_password"])
    user.recovery_code = None
    db.session.commit()

    return jsonify({"msg": "Contraseña actualizada correctamente"})
