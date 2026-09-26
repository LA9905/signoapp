from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.notification_model import Notification

notification_bp = Blueprint("notifications", __name__)


@notification_bp.route("/notifications", methods=["GET"])
@jwt_required()
def list_notifications():
    uid = int(get_jwt_identity())
    limit = min(int(request.args.get("limit", 50)), 100)
    only_unread = request.args.get("unread") == "1"

    q = Notification.query.filter_by(user_id=uid)
    if only_unread:
        q = q.filter_by(is_read=False)
    items = q.order_by(Notification.id.desc()).limit(limit).all()
    unread_count = Notification.query.filter_by(user_id=uid, is_read=False).count()

    return jsonify({
        "notifications": [n.to_dict() for n in items],
        "unread_count": unread_count,
    }), 200


@notification_bp.route("/notifications/unread-count", methods=["GET"])
@jwt_required()
def unread_count():
    uid = int(get_jwt_identity())
    count = Notification.query.filter_by(user_id=uid, is_read=False).count()
    return jsonify({"unread_count": count}), 200


@notification_bp.route("/notifications/<int:nid>/read", methods=["POST"])
@jwt_required()
def mark_read(nid):
    uid = int(get_jwt_identity())
    n = Notification.query.filter_by(id=nid, user_id=uid).first_or_404()
    n.is_read = True
    db.session.commit()
    return jsonify(n.to_dict()), 200


@notification_bp.route("/notifications/read-all", methods=["POST"])
@jwt_required()
def mark_all_read():
    uid = int(get_jwt_identity())
    Notification.query.filter_by(user_id=uid, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"msg": "Todas marcadas como leídas"}), 200