# app/routes/billing_routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user_model import User
from datetime import date, datetime
from app.utils.billing import is_blocked
import sqlalchemy as sa

billing_bp = Blueprint("billing", __name__)

def _parse_date(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except Exception:
        return None

@billing_bp.route("/billing/status", methods=["GET"])
@jwt_required()
def my_billing_status():
    uid = get_jwt_identity()
    me = User.query.get(uid)
    if not me:
        return jsonify({"msg": "No encontrado"}), 404

    target = me
    email = (request.args.get("email") or "").strip().lower()  # Asegurar minúsculas
    user_id = request.args.get("user_id")

    if me.is_admin and (email or user_id):
        q = User.query
        if email:
            q = q.filter(sa.func.lower(User.email) == email)  # Búsqueda insensible
        elif user_id and str(user_id).isdigit():
            q = q.filter_by(id=int(user_id))
        else:
            return jsonify({"msg": "Parámetros inválidos"}), 400
        target = q.first()
        if not target:
            return jsonify({"msg": "Usuario no encontrado"}), 404

    return jsonify({
        "today": date.today().isoformat(),
        "viewer_is_admin": bool(me.is_admin),
        "user": {
            "id": target.id,
            "name": target.name,
            "email": target.email,
            "is_admin": target.is_admin,
            "due_day": target.due_day,
            "subscription_paid_until": target.subscription_paid_until.isoformat() if target.subscription_paid_until else None,
            "blocked": is_blocked(target),
        }
    }), 200

@billing_bp.route("/billing/mark-paid", methods=["POST"])
@jwt_required()
def mark_paid():
    uid = get_jwt_identity()
    viewer = User.query.get(uid)
    if not viewer or not viewer.is_admin:
        return jsonify({"msg": "Solo administradores"}), 403

    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    until_str = (data.get("until") or "").strip()  # "YYYY-MM-DD"

    try:
        until = datetime.strptime(until_str, "%Y-%m-%d").date() if until_str else date.today()
    except Exception:
        return jsonify({"msg": "Fecha 'until' inválida"}), 400

    # 👉 GLOBAL: si no se envía email, aplicar a TODOS los usuarios
    if not email:
        db.session.execute(
            sa.text('UPDATE "user" SET subscription_paid_until = :until'),
            {"until": until}
        )
        db.session.commit()
        return jsonify({"ok": True, "scope": "all", "until": until.isoformat()}), 200

    # O bien marcar solo a uno (si se envía email)
    u = User.query.filter(db.func.lower(User.email) == email).first()
    if not u:
        return jsonify({"msg": "Usuario no encontrado"}), 404

    u.subscription_paid_until = until
    db.session.commit()
    return jsonify({"ok": True, "scope": "one", "email": u.email, "until": until.isoformat()}), 200


@billing_bp.route("/billing/users", methods=["GET"])
@jwt_required()
def get_all_users():
    uid = get_jwt_identity()
    viewer = User.query.get(uid)
    if not viewer or not viewer.is_admin:
        return jsonify({"msg": "Solo administradores"}), 403

    users = User.query.all()
    return jsonify({
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "subscription_paid_until": u.subscription_paid_until.isoformat() if u.subscription_paid_until else None,
                "blocked": is_blocked(u),
            }
            for u in users
        ]
    }), 200

@billing_bp.route("/billing/mark-paid-multiple", methods=["POST"])
@jwt_required()
def mark_paid_multiple():
    uid = get_jwt_identity()
    viewer = User.query.get(uid)
    if not viewer or not viewer.is_admin:
        return jsonify({"msg": "Solo administradores"}), 403

    data = request.get_json() or {}
    user_ids = data.get("user_ids", [])  # Lista de IDs de usuarios a desbloquear
    until_str = (data.get("until") or "").strip()

    try:
        until = datetime.strptime(until_str, "%Y-%m-%d").date() if until_str else date.today()
    except Exception:
        return jsonify({"msg": "Fecha 'until' inválida"}), 400

    if not user_ids:
        return jsonify({"msg": "Debe proporcionar user_ids"}), 400

    updated = User.query.filter(User.id.in_(user_ids)).update(
        {User.subscription_paid_until: until}, synchronize_session=False
    )
    db.session.commit()

    return jsonify({"ok": True, "scope": "multiple", "updated_count": updated, "until": until.isoformat()}), 200

@billing_bp.route("/billing/block-multiple", methods=["POST"])
@jwt_required()
def block_multiple():
    uid = get_jwt_identity()
    viewer = User.query.get(uid)
    if not viewer or not viewer.is_admin:
        return jsonify({"msg": "Solo administradores"}), 403

    data = request.get_json() or {}
    user_ids = data.get("user_ids", [])  # Lista de IDs de usuarios a bloquear

    if not user_ids:
        return jsonify({"msg": "Debe proporcionar user_ids"}), 400

    updated = User.query.filter(User.id.in_(user_ids)).update(
        {User.subscription_paid_until: None}, synchronize_session=False
    )
    db.session.commit()

    return jsonify({"ok": True, "scope": "multiple_block", "updated_count": updated}), 200