from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user_model import User
from app.models.operator_model import Operator
from app.models.driver_model import Driver
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
        "viewer_is_super_admin": bool(me.is_super_admin),
        "user": {
            "id": target.id,
            "name": target.name,
            "email": target.email,
            "is_admin": target.is_admin,
            "is_super_admin": target.is_super_admin,
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
    if not viewer or not viewer.is_super_admin:
        return jsonify({"msg": "Solo el administrador principal puede hacer esto"}), 403

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

    operators_by_id = {o.id: o.name for o in Operator.query.all()}
    drivers_by_id = {d.id: d.name for d in Driver.query.all()}

    users = User.query.all()
    return jsonify({
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "subscription_paid_until": u.subscription_paid_until.isoformat() if u.subscription_paid_until else None,
                "blocked": is_blocked(u),
                "can_edit_stock": u.can_edit_stock,
                "notify_low_stock": u.notify_low_stock,
                "notify_pending_dispatches": u.notify_pending_dispatches,
                "is_admin": u.is_admin,
                "is_super_admin": u.is_super_admin,
                "linked_operator_id": u.linked_operator_id,
                "linked_operator_name": operators_by_id.get(u.linked_operator_id),
                "linked_driver_id": u.linked_driver_id,
                "linked_driver_name": drivers_by_id.get(u.linked_driver_id),
            }
            for u in users
        ]
    }), 200

@billing_bp.route("/billing/mark-paid-multiple", methods=["POST"])
@jwt_required()
def mark_paid_multiple():
    uid = get_jwt_identity()
    viewer = User.query.get(uid)
    if not viewer or not viewer.is_super_admin:
        return jsonify({"msg": "Solo el administrador principal puede hacer esto"}), 403

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
    if not viewer or not viewer.is_super_admin:
        return jsonify({"msg": "Solo el administrador principal puede hacer esto"}), 403

    data = request.get_json() or {}
    user_ids = data.get("user_ids", [])  # Lista de IDs de usuarios a bloquear

    if not user_ids:
        return jsonify({"msg": "Debe proporcionar user_ids"}), 400

    updated = User.query.filter(User.id.in_(user_ids)).update(
        {User.subscription_paid_until: None}, synchronize_session=False
    )
    db.session.commit()

    return jsonify({"ok": True, "scope": "multiple_block", "updated_count": updated}), 200

# Al final de billing_routes.py

@billing_bp.route("/billing/delete-multiple", methods=["DELETE"])
@jwt_required()
def delete_multiple():
    uid = get_jwt_identity()
    viewer = User.query.get(uid)
    
    # Verificación de seguridad: solo el administrador entra
    if not viewer or not viewer.is_super_admin:
        return jsonify({"msg": "Solo el administrador principal puede hacer esto"}), 403

    data = request.get_json() or {}
    user_ids = data.get("user_ids", [])

    if not user_ids:
        return jsonify({"msg": "Debe proporcionar user_ids"}), 400

    try:
        # Eliminación física de la base de datos
        deleted_count = User.query.filter(User.id.in_(user_ids)).delete(synchronize_session=False)
        db.session.commit()
        
        return jsonify({
            "ok": True, 
            "msg": f"Se han eliminado {deleted_count} usuarios correctamente.",
            "deleted_count": deleted_count
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": "Error al eliminar los usuarios", "error": str(e)}), 500


@billing_bp.route("/billing/set-stock-permission", methods=["POST"])
@jwt_required()
def set_stock_permission():
    uid = get_jwt_identity()
    viewer = User.query.get(uid)
    if not viewer or not viewer.is_admin:
        return jsonify({"msg": "Solo administradores"}), 403

    data = request.get_json() or {}
    user_ids = data.get("user_ids", [])
    can_edit = bool(data.get("can_edit_stock", False))

    if not user_ids:
        return jsonify({"msg": "Debe proporcionar user_ids"}), 400

    updated = User.query.filter(User.id.in_(user_ids)).update(
        {User.can_edit_stock: can_edit}, synchronize_session=False
    )
    db.session.commit()
    return jsonify({"ok": True, "updated_count": updated, "can_edit_stock": can_edit}), 200 


@billing_bp.route("/billing/set-notification-prefs", methods=["POST"])
@jwt_required()
def set_notification_prefs():
    uid = get_jwt_identity()
    viewer = User.query.get(uid)
    if not viewer or not viewer.is_admin:
        return jsonify({"msg": "Solo administradores"}), 403

    data = request.get_json() or {}
    user_ids = data.get("user_ids", [])
    if not user_ids:
        return jsonify({"msg": "Debe proporcionar user_ids"}), 400

    updates = {}
    if "notify_low_stock" in data:
        updates[User.notify_low_stock] = bool(data["notify_low_stock"])
    if "notify_pending_dispatches" in data:
        updates[User.notify_pending_dispatches] = bool(data["notify_pending_dispatches"])

    if not updates:
        return jsonify({"msg": "Debe indicar al menos un campo a actualizar"}), 400

    updated = User.query.filter(User.id.in_(user_ids)).update(
        updates, synchronize_session=False
    )
    db.session.commit()
    return jsonify({"ok": True, "updated_count": updated}), 200


@billing_bp.route("/billing/set-employee-link", methods=["POST"])
@jwt_required()
def set_employee_link():
    """
    Vincula (o desvincula) a un usuario con un Operario o un Chofer
    existente, con un clic desde el panel de administración. Un usuario
    solo puede ser UNA cosa a la vez (operario, chofer, o ninguno) —
    vincularlo a uno limpia automáticamente el otro. Cualquier admin
    (gestor o principal) puede hacer esto.
    """
    uid = get_jwt_identity()
    viewer = User.query.get(uid)
    if not viewer or not viewer.is_admin:
        return jsonify({"msg": "Solo administradores"}), 403

    data = request.get_json() or {}
    user_id = data.get("user_id")
    role = (data.get("role") or "").strip().lower()

    if not user_id:
        return jsonify({"msg": "Debe proporcionar user_id"}), 400
    if role not in ("operator", "driver", "none"):
        return jsonify({"msg": "El campo 'role' debe ser 'operator', 'driver' o 'none'"}), 400

    target = User.query.get(user_id)
    if not target:
        return jsonify({"msg": "Usuario no encontrado"}), 404

    if role == "none":
        target.linked_operator_id = None
        target.linked_driver_id = None

    elif role == "operator":
        operator_id = data.get("operator_id")
        if not operator_id:
            return jsonify({"msg": "Debe proporcionar operator_id"}), 400
        operator = Operator.query.get(operator_id)
        if not operator:
            return jsonify({"msg": "Operario no encontrado"}), 404
        # Evita que dos usuarios queden apuntando al mismo operario.
        other = User.query.filter(User.linked_operator_id == operator_id, User.id != target.id).first()
        if other:
            return jsonify({"msg": f"Ese operario ya está vinculado al usuario {other.email}"}), 409
        target.linked_operator_id = operator_id
        target.linked_driver_id = None  # un usuario es operario O chofer, no ambos

    elif role == "driver":
        driver_id = data.get("driver_id")
        if not driver_id:
            return jsonify({"msg": "Debe proporcionar driver_id"}), 400
        driver = Driver.query.get(driver_id)
        if not driver:
            return jsonify({"msg": "Chofer no encontrado"}), 404
        other = User.query.filter(User.linked_driver_id == driver_id, User.id != target.id).first()
        if other:
            return jsonify({"msg": f"Ese chofer ya está vinculado al usuario {other.email}"}), 409
        target.linked_driver_id = driver_id
        target.linked_operator_id = None

    db.session.commit()
    return jsonify({
        "ok": True,
        "user_id": target.id,
        "linked_operator_id": target.linked_operator_id,
        "linked_driver_id": target.linked_driver_id,
    }), 200


@billing_bp.route("/billing/set-admin-status", methods=["POST"])
@jwt_required()
def set_admin_status():
    """
    Otorga o quita el rol de administrador "gestor" (is_admin) a otro
    usuario. Solo el administrador principal (is_super_admin) puede
    hacerlo — de lo contrario un admin gestor podría promoverse a sí
    mismo o a otros. Nunca se puede modificar aquí a un usuario que ya es
    is_super_admin.
    """
    uid = get_jwt_identity()
    viewer = User.query.get(uid)
    if not viewer or not viewer.is_super_admin:
        return jsonify({"msg": "Solo el administrador principal puede hacer esto"}), 403

    data = request.get_json() or {}
    user_id = data.get("user_id")
    make_admin = data.get("is_admin")
    if not user_id or make_admin is None:
        return jsonify({"msg": "Debe proporcionar user_id e is_admin"}), 400

    target = User.query.get(user_id)
    if not target:
        return jsonify({"msg": "Usuario no encontrado"}), 404

    if target.is_super_admin:
        return jsonify({"msg": "No se puede modificar al administrador principal"}), 400

    target.is_admin = bool(make_admin)
    db.session.commit()
    return jsonify({"ok": True, "user_id": target.id, "is_admin": target.is_admin}), 200