from flask import Blueprint, request, jsonify, current_app
from .. import db
from ..models import User
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import random
from ..utils.mailer import send_recovery_code, send_update_code
from datetime import timedelta
import os
from jwt import decode
import cloudinary
import cloudinary.uploader
from ..models.scheduler import daily_notifications


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

    email_lower = data["email"].lower()
    if User.query.filter_by(email=email_lower).first():
        return jsonify({"msg": "Ya existe un usuario con ese correo"}), 400

    user = User(name=data["name"], email=email_lower)
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()

    return jsonify({"msg": "Usuario registrado correctamente"}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    email_lower = data.get("email", "").lower()
    user = User.query.filter_by(email=email_lower).first()
    if not user or not user.check_password(data.get("password", "")):
        return jsonify({"msg": "Credenciales inválidas"}), 401

    token = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=8))
    return jsonify({"token": token, "name": user.name}), 200

@auth_bp.route("/recover", methods=["POST"])
def recover():
    data = request.json or {}
    email_lower = data.get("email", "").lower()
    user = User.query.filter_by(email=email_lower).first()
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
    email_lower = data.get("email", "").lower()
    user = User.query.filter_by(email=email_lower).first()
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
    
    limited_emails = [
        "claudiogarbarino1966@gmail.com",
        "alfonsomachado64@gmail.com",
        "jerrykalet@gmail.com",
        "cocachaucono@gmail.com"
    ]
    is_limited = user.email.lower() in [email.lower() for email in limited_emails]

    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "avatar_url": user.avatar_url,
        "is_admin": user.is_admin,
        "is_limited": is_limited,  # Nuevo campo para identificar usuarios limitados
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
    target_email_lower = target_email.lower()

    if target_email_lower != user.email.lower():
        if User.query.filter_by(email=target_email_lower).first():
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

    if email and email.lower() != user.email.lower():
        email_lower = email.lower()
        if User.query.filter(User.email == email_lower, User.id != user.id).first():
            return jsonify({"msg": "Ese correo ya está registrado"}), 400
        user.email = email_lower

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
    

@auth_bp.route("/unsubscribe", methods=["GET"])
def unsubscribe():
        token = request.args.get("token")
        if not token:
            return jsonify({"msg": "Token faltante"}), 400

        try:
            decoded = decode(token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
            uid = decoded.get("sub")
            if not uid:
                return jsonify({"msg": "Token inválido"}), 400

            user = User.query.get(uid)
            if not user:
                return jsonify({"msg": "Usuario no encontrado"}), 404

            user.receive_notifications = False
            db.session.commit()
            return jsonify({"msg": "Suscripción cancelada correctamente. Ya no recibirás notificaciones."}), 200
        except Exception as e:
            return jsonify({"msg": "Token inválido o expirado", "details": str(e)}), 400
        

@auth_bp.route("/profile/notifications", methods=["PATCH"])
@jwt_required()
def toggle_notifications():
    uid = get_jwt_identity()
    user = User.query.get(uid)
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404

    data = request.json or {}
    enable = data.get("enable", True)
    user.receive_notifications = bool(enable)
    db.session.commit()
    return jsonify({"msg": f"Notificaciones {'activadas' if enable else 'desactivadas'}"}), 200


@auth_bp.route('/test-notif', methods=['GET'])
@jwt_required()
def test_notif():
    from app import create_app
    app = create_app()
    daily_notifications(app)
    return jsonify({"msg": "Notificaciones testeadas"}), 200