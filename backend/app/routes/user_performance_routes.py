from flask import Blueprint, request, jsonify
from datetime import date
from app.utils.user_performance import evaluar_usuarios_logistica
from flask_jwt_extended import jwt_required

user_performance_bp = Blueprint("user_performance", __name__)


@user_performance_bp.route("/users/performance", methods=["GET"])
@jwt_required()
def users_performance():
    try:
        month_param = request.args.get("month")
        if month_param:
            year, month = map(int, month_param.split("-"))
        else:
            today = date.today()
            year, month = today.year, today.month

        resultados = evaluar_usuarios_logistica(year, month)
        return jsonify({"year": year, "month": month, "users": resultados}), 200
    except Exception as e:
        return jsonify({"error": "No se pudo calcular el rendimiento de logística", "details": str(e)}), 500