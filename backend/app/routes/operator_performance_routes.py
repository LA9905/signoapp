from flask import Blueprint, request, jsonify
from datetime import date
from app import db
from app.models.operator_model import Operator
from app.models.operator_activity_model import OperatorActivity
from app.utils.performance import evaluar_operador
from flask_jwt_extended import jwt_required, get_jwt_identity
import cloudinary.uploader

performance_bp = Blueprint("operator_performance", __name__)


@performance_bp.route("/operators/performance", methods=["GET"])
@jwt_required()
def operators_performance():
    try:
        month_param = request.args.get("month")  # formato "YYYY-MM"
        if month_param:
            year, month = map(int, month_param.split("-"))
        else:
            today = date.today()
            year, month = today.year, today.month

        operators = Operator.query.all()
        resultados = []
        ratios_validos = []
        for op in operators:
            data = evaluar_operador(op.id, year, month)
            data.update({
                "operator_id": op.id,
                "name": op.name,
                "photo_url": op.photo_url,
            })
            resultados.append(data)
            if data["ratio"] is not None:
                ratios_validos.append(data["ratio"])

        for r in resultados:
            if r["ratio"] is not None and ratios_validos:
                menores = sum(1 for x in ratios_validos if x <= r["ratio"])
                r["percentil"] = round(100 * menores / len(ratios_validos))
            else:
                r["percentil"] = None

        return jsonify({"year": year, "month": month, "operators": resultados}), 200
    except Exception as e:
        return jsonify({"error": "No se pudo calcular el rendimiento", "details": str(e)}), 500


@performance_bp.route("/operators/<int:operator_id>/photo", methods=["POST"])
@jwt_required()
def upload_operator_photo(operator_id):
    try:
        operator = Operator.query.get_or_404(operator_id)
        file = request.files.get("photo")
        if not file:
            return jsonify({"error": "No se envió ningún archivo"}), 400
        result = cloudinary.uploader.upload(
            file, folder="operators", public_id=f"operator_{operator_id}", overwrite=True,
        )
        operator.photo_url = result.get("secure_url")
        db.session.commit()
        return jsonify(operator.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo subir la foto", "details": str(e)}), 500


@performance_bp.route("/operators/<int:operator_id>/activities", methods=["GET"])
@jwt_required()
def list_operator_activities(operator_id):
    month_param = request.args.get("month")
    q = OperatorActivity.query.filter_by(operator_id=operator_id)
    if month_param:
        year, month = map(int, month_param.split("-"))
        q = q.filter(db.extract("year", OperatorActivity.fecha) == year)
        q = q.filter(db.extract("month", OperatorActivity.fecha) == month)
    activities = q.order_by(OperatorActivity.fecha.desc()).all()
    return jsonify([a.to_dict() for a in activities]), 200


@performance_bp.route("/operators/<int:operator_id>/activities", methods=["POST"])
@jwt_required()
def create_operator_activity(operator_id):
    try:
        Operator.query.get_or_404(operator_id)
        data = request.get_json() or {}
        fecha_str = data.get("fecha")
        horas = data.get("horas")
        nota = (data.get("nota") or "").strip()
        if not fecha_str or horas is None:
            return jsonify({"error": "Faltan campos requeridos (fecha, horas)"}), 400
        fecha = date.fromisoformat(fecha_str)
        user_id = get_jwt_identity()

        existing = OperatorActivity.query.filter_by(operator_id=operator_id, fecha=fecha).first()
        if existing:
            existing.horas = float(horas)
            existing.nota = nota
        else:
            existing = OperatorActivity(
                operator_id=operator_id, fecha=fecha, horas=float(horas),
                nota=nota, created_by=user_id,
            )
            db.session.add(existing)
        db.session.commit()
        return jsonify(existing.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo registrar la actividad", "details": str(e)}), 500


@performance_bp.route("/operators/activities/<int:activity_id>", methods=["DELETE"])
@jwt_required()
def delete_operator_activity(activity_id):
    try:
        activity = OperatorActivity.query.get_or_404(activity_id)
        db.session.delete(activity)
        db.session.commit()
        return jsonify({"message": "Actividad eliminada"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo eliminar la actividad", "details": str(e)}), 500