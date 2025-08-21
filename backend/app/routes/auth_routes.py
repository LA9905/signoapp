from flask import Blueprint, request, jsonify
from .. import db
from ..models import User
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import random
from ..utils.mailer import send_recovery_code, send_update_code
from datetime import timedelta
import os

import cloudinary
import cloudinary.uploader

cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
api_key = os.getenv("CLOUDINARY_API_KEY")
api_secret = os.getenv("CLOUDINARY_API_SECRET")
if cloud_name and api_key and api_secret:
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True
    )

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json or {}
    if not data.get("email") or not data.get("password") or not data.get("name"):
        return jsonify({"msg": "Faltan campos"}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"msg": "Ya existe un usuario con ese correo"}), 400

    user = User(name=data["name"], email=data["email"])
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()

    return jsonify({"msg": "Usuario registrado correctamente"}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    user = User.query.filter_by(email=data.get("email")).first()
    if not user or not user.check_password(data.get("password", "")):
        return jsonify({"msg": "Credenciales inválidas"}), 401

    token = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=8))
    return jsonify({"token": token, "name": user.name}), 200

@auth_bp.route("/recover", methods=["POST"])
def recover():
    data = request.json or {}
    user = User.query.filter_by(email=data.get("email")).first()
    if not user:
        return jsonify({"msg": "Correo no registrado"}), 404

    code = str(random.randint(100000, 999999))
    user.recovery_code = code
    db.session.commit()

    send_recovery_code(user.email, code)
    return jsonify({"msg": "Código enviado al correo"}), 200

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.json or {}
    user = User.query.filter_by(email=data.get("email")).first()
    if not user or user.recovery_code != data.get("code"):
        return jsonify({"msg": "Código inválido"}), 400

    user.set_password(data.get("new_password", ""))
    user.recovery_code = None
    db.session.commit()
    return jsonify({"msg": "Contraseña actualizada correctamente"}), 200

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    uid = get_jwt_identity()
    user = User.query.get(uid)
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404
    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "avatar_url": user.avatar_url,
        "is_admin": user.is_admin,
        "subscription_paid_until": user.subscription_paid_until.isoformat() if user.subscription_paid_until else None,
        "due_day": user.due_day,
    }), 200

@auth_bp.route("/profile/request-code", methods=["POST"])
@jwt_required()
def request_update_code():
    uid = get_jwt_identity()
    user = User.query.get(uid)
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404

    data = request.json or {}
    target_email = data.get("target_email") or user.email

    if target_email != user.email:
        if User.query.filter_by(email=target_email).first():
            return jsonify({"msg": "Ese correo ya está registrado"}), 400

    code = str(random.randint(100000, 999999))
    user.update_code = code
    db.session.commit()

    send_update_code(target_email, code)
    return jsonify({"msg": "Código enviado"}), 200

@auth_bp.route("/profile/update", methods=["PUT"])
@jwt_required()
def update_profile():
    uid = get_jwt_identity()
    user = User.query.get(uid)
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404

    code = request.form.get("code")
    if not code or user.update_code != code:
        return jsonify({"msg": "Código inválido o faltante"}), 400

    name = (request.form.get("name") or "").strip()
    email = (request.form.get("email") or "").strip()
    password = (request.form.get("password") or "").strip()

    if name:
        user.name = name

    if email and email != user.email:
        if User.query.filter(User.email == email, User.id != user.id).first():
            return jsonify({"msg": "Ese correo ya está registrado"}), 400
        user.email = email

    if password:
        user.set_password(password)

    if "avatar" in request.files and cloud_name:
        avatar_file = request.files["avatar"]
        if avatar_file:
            try:
                upload_result = cloudinary.uploader.upload(
                    avatar_file,
                    folder="signoapp/avatars",
                    public_id=f"user_{user.id}",
                    overwrite=True,
                    resource_type="image"
                )
                user.avatar_url = upload_result.get("secure_url")
            except Exception as e:
                return jsonify({"msg": "Error subiendo imagen", "details": str(e)}), 500

    user.update_code = None
    db.session.commit()

    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "avatar_url": user.avatar_url
    }), 200

@auth_bp.route("/delete-account", methods=["DELETE"])
@jwt_required()
def delete_account():
    uid = get_jwt_identity()
    user = User.query.get(uid)
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404

    try:
        if cloud_name:
            try:
                cloudinary.uploader.destroy("signoapp/avatars/user_{}".format(user.id), resource_type="image", invalidate=True)
            except Exception:
                pass

        db.session.delete(user)
        db.session.commit()
        return jsonify({"msg": "Cuenta eliminada"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "No se pudo eliminar la cuenta", "details": str(e)}), 500