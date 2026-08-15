from flask import Blueprint, request, jsonify
from datetime import date
from app import db
from app.models.driver_model import Driver
from app.utils.driver_performance import evaluar_chofer, is_evaluable_driver, daily_detail_for_driver
from flask_jwt_extended import jwt_required, get_jwt_identity
import cloudinary.uploader

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
            data.update({"driver_id": dr.id, "name": dr.name, "photo_url": dr.photo_url})
            resultados.append(data)

        return jsonify({"year": year, "month": month, "drivers": resultados}), 200
    except Exception as e:
        return jsonify({"error": "No se pudo calcular el rendimiento de choferes", "details": str(e)}), 500

@driver_performance_bp.route("/drivers/<int:driver_id>/photo", methods=["POST"])
@jwt_required()
def upload_driver_photo(driver_id):
    try:
        driver = Driver.query.get_or_404(driver_id)
        file = request.files.get("photo")
        if not file:
            return jsonify({"error": "No se envió ningún archivo"}), 400
        result = cloudinary.uploader.upload(
            file, folder="drivers", public_id=f"driver_{driver_id}", overwrite=True,
        )
        driver.photo_url = result.get("secure_url")
        db.session.commit()
        return jsonify(driver.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo subir la foto", "details": str(e)}), 500


@driver_performance_bp.route("/drivers/<int:driver_id>/performance/detail", methods=["GET"])
@jwt_required()
def driver_performance_detail(driver_id):
    try:
        driver = Driver.query.get_or_404(driver_id)
        month_param = request.args.get("month")
        if month_param:
            year, month = map(int, month_param.split("-"))
        else:
            today = date.today()
            year, month = today.year, today.month

        resumen = evaluar_chofer(driver_id, year, month)
        diario = daily_detail_for_driver(driver_id, year, month)

        if resumen["ratio"] is not None:
            explicacion = (
                "El rendimiento del chofer se calcula como el porcentaje de despachos "
                "asignados en el mes que quedaron marcados como 'Pedido Entregado' "
                "(entregados al cliente) sobre el total de despachos que le fueron "
                "asignados ese mes. Un despacho pendiente de marcar cuenta en contra "
                "de ese porcentaje aunque el chofer ya lo haya entregado físicamente, "
                "porque el sistema solo puede medir lo que quedó registrado. "
                f"Este mes a {driver.name} se le asignaron {resumen['total_despachos']} "
                f"despachos, de los cuales {resumen['entregados']} quedaron marcados "
                f"como entregados y {resumen['pendientes']} siguen sin marcar, dando "
                f"un {round(resumen['ratio'] * 100)}% de cumplimiento."
            )
        else:
            explicacion = (
                "El rendimiento del chofer se calcula como el porcentaje de despachos "
                "asignados en el mes que quedaron marcados como 'Pedido Entregado' "
                "(entregados al cliente) sobre el total de despachos que le fueron "
                "asignados ese mes. Todavía no hay despachos asignados a este chofer "
                "en el mes seleccionado."
            )

        return jsonify({
            "driver_id": driver.id,
            "name": driver.name,
            "photo_url": driver.photo_url,
            "year": year,
            "month": month,
            "resumen": resumen,
            "diario": diario,
            "explicacion": explicacion,
        }), 200
    except Exception as e:
        return jsonify({"error": "No se pudo obtener el detalle de rendimiento", "details": str(e)}), 500