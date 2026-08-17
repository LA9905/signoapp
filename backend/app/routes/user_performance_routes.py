from flask import Blueprint, request, jsonify
from datetime import date
from app.utils.user_performance import evaluar_usuarios_logistica, evaluar_usuario, daily_detail_for_user
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


@user_performance_bp.route("/users/<string:user_id>/performance/detail", methods=["GET"])
@jwt_required()
def user_performance_detail(user_id):
    try:
        month_param = request.args.get("month")
        if month_param:
            year, month = map(int, month_param.split("-"))
        else:
            today = date.today()
            year, month = today.year, today.month

        resumen = evaluar_usuario(user_id, year, month)
        if not resumen:
            return jsonify({"error": "El usuario no tiene despachos registrados en este mes"}), 404

        diario = daily_detail_for_user(user_id, year, month)

        volumen_txt = (
            f"un volumen {round(resumen['volumen_ratio'] * 100)}% respecto al promedio del equipo"
            if resumen["volumen_ratio"] is not None else "un volumen no comparable (aún sin promedio de equipo)"
        )
        motivos_txt = (
            ", ".join(f"{m['label'].lower()} ({m['count']})" for m in resumen["motivos_frecuentes"])
            if resumen["motivos_frecuentes"] else "sin un motivo predominante"
        )

        explicacion = (
            "El rendimiento de logística combina dos factores: el VOLUMEN de despachos "
            "creados respecto al promedio del equipo ese mes, y la PRECISIÓN, es decir "
            "qué proporción de sus despachos NO tuvo que ser corregida después (orden, "
            "chofer o productos incorrectos). El porcentaje final es volumen × precisión, "
            "así que un usuario con mucho volumen pero muchos errores puede terminar peor "
            "clasificado que uno con menos volumen pero más preciso. "
            f"Este mes {resumen['name']} creó {resumen['total_despachos']} despachos "
            f"({volumen_txt}), de los cuales {resumen['editados']} tuvieron que corregirse "
            f"({round(resumen['tasa_error'] * 100)}% de tasa de error), con {motivos_txt} "
            f"como motivo. Esto da un {round(resumen['ratio'] * 100) if resumen['ratio'] is not None else '—'}% "
            "final de rendimiento."
        )

        return jsonify({
            "user_id": resumen["user_id"],
            "name": resumen["name"],
            "photo_url": resumen["photo_url"],
            "year": year,
            "month": month,
            "resumen": resumen,
            "diario": diario,
            "explicacion": explicacion,
        }), 200
    except Exception as e:
        return jsonify({"error": "No se pudo obtener el detalle de rendimiento", "details": str(e)}), 500