from flask import Blueprint, request, jsonify
from datetime import date
from app.models.driver_model import Driver
from app.utils.driver_performance import evaluar_chofer, is_evaluable_driver
from flask_jwt_extended import jwt_required

driver_performance_bp = Blueprint("driver_performance", __name__)


@driver_performance_bp.route("/drivers/performance", methods=["GET"])
@jwt_required()
def drivers_performance():
    try:
        month_param = request.args.get("month")
        if month_param:
            year, month = map(int, month_param.split("-"))
        else:
            today = date.today()
            year, month = today.year, today.month

        drivers = Driver.query.order_by(Driver.name.asc()).all()
        resultados = []
        for dr in drivers:
            if not is_evaluable_driver(dr.name):
                continue
            data = evaluar_chofer(dr.id, year, month)
            data.update({"driver_id": dr.id, "name": dr.name})
            resultados.append(data)

        return jsonify({"year": year, "month": month, "drivers": resultados}), 200
    except Exception as e:
        return jsonify({"error": "No se pudo calcular el rendimiento de choferes", "details": str(e)}), 500