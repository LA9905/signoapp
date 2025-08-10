from flask import Blueprint, jsonify
from app import db
from sqlalchemy import text

health_bp = Blueprint("health", __name__)

@health_bp.route("/health", methods=["GET"])
def health():
    try:
        # En SQLAlchemy 2.x usa text("SELECT 1")
        db.session.execute(text("SELECT 1"))
        return jsonify({"ok": True}), 200
    except Exception as e:
        db.session.rollback()
        # 503 es más apropiado para healthcheck fallido
        return jsonify({"ok": False, "error": str(e)}), 503