from flask import Blueprint, request, jsonify
from datetime import date
from sqlalchemy import func
from app import db
from app.models.operator_model import Operator
from app.models.operator_activity_model import OperatorActivity
from app.models.user_model import User
from app.models.product_model import Product
from app.models.production_model import ProductionProduct
from app.routes.product_routes import normalize_search
from app.utils.performance import (
    evaluar_operador,
    daily_detail_for_operator,
    get_operator_for_user_email,
    current_record_for_product,
    normalizar_nombre,
    unidad_por_producto_map,
)
from flask_jwt_extended import jwt_required, get_jwt_identity
import cloudinary.uploader

performance_bp = Blueprint("operator_performance", __name__)


@performance_bp.route("/products/records", methods=["GET"])
@jwt_required()
def products_records():
    """
    Récord actual (mejor producción por hora jamás registrada, en un solo
    día) de cada producto, para que cualquier operario pueda buscar el
    producto que va a fabricar y ver de inmediato cuál es la marca a
    superar. Sin restricción de rol — también deben poder verlo los
    usuarios de operario limitados.
    """
    try:
        search = normalize_search(request.args.get("search") or "")
        products = Product.query.order_by(Product.name.asc()).all()
        unidad_map = unidad_por_producto_map()

        resultados = []
        for p in products:
            if search and search not in normalize_search(p.name):
                continue

            nombre_norm = normalizar_nombre(p.name)
            record = current_record_for_product(nombre_norm)

            resultados.append({
                "id": p.id,
                "name": p.name,
                "category": p.category,
                "unidad": unidad_map.get(nombre_norm),
                "record": record,
            })

        return jsonify(resultados), 200
    except Exception as e:
        return jsonify({"error": "No se pudo obtener los récords de productos", "details": str(e)}), 500


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


@performance_bp.route("/operators/<int:operator_id>/performance/detail", methods=["GET"])
@jwt_required()
def operator_performance_detail(operator_id):
    try:
        operator = Operator.query.get_or_404(operator_id)
        month_param = request.args.get("month")
        if month_param:
            year, month = map(int, month_param.split("-"))
        else:
            today = date.today()
            year, month = today.year, today.month

        resumen = evaluar_operador(operator_id, year, month)
        diario, principal = daily_detail_for_operator(operator_id, year, month)

        actividades = (
            OperatorActivity.query
            .filter(OperatorActivity.operator_id == operator_id)
            .filter(db.extract('year', OperatorActivity.fecha) == year)
            .filter(db.extract('month', OperatorActivity.fecha) == month)
            .order_by(OperatorActivity.fecha.asc())
            .all()
        )

        return jsonify({
            "operator_id": operator.id,
            "name": operator.name,
            "photo_url": operator.photo_url,
            "year": year,
            "month": month,
            "resumen": resumen,
            "producto_principal": principal,
            "diario": diario,
            "actividades": [a.to_dict() for a in actividades],
            "explicacion": (
                "El rendimiento se calcula por producto exacto: cuánto produjo el "
                "operario por cada hora EFECTIVA de trabajo (horario laboral menos las "
                "horas registradas en otras actividades ese día), comparado contra la "
                "mediana histórica de ese mismo producto entre todos los operarios que "
                "lo hayan fabricado. Si el resultado alcanza o supera el 100% de ese "
                "histórico, el mes clasifica como Alta o Muy Alta y da derecho a bono "
                "de producción. Registrar las horas de otras actividades del operario "
                "reduce sus horas efectivas y por lo tanto sube su producción por hora, "
                "reflejando mejor su rendimiento real en tareas productivas."
            ),
        }), 200
    except Exception as e:
        return jsonify({"error": "No se pudo obtener el detalle de rendimiento", "details": str(e)}), 500


@performance_bp.route("/operators/me/performance/detail", methods=["GET"])
@jwt_required()
def my_operator_performance_detail():
    try:
        uid = get_jwt_identity()
        user = User.query.get(uid)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        operator = get_operator_for_user_email(user.email)
        if not operator:
            return jsonify({"error": "Este usuario no tiene un operario asociado"}), 404

        month_param = request.args.get("month")
        if month_param:
            year, month = map(int, month_param.split("-"))
        else:
            today = date.today()
            year, month = today.year, today.month

        resumen = evaluar_operador(operator.id, year, month)
        diario, principal = daily_detail_for_operator(operator.id, year, month)

        actividades = (
            OperatorActivity.query
            .filter(OperatorActivity.operator_id == operator.id)
            .filter(db.extract('year', OperatorActivity.fecha) == year)
            .filter(db.extract('month', OperatorActivity.fecha) == month)
            .order_by(OperatorActivity.fecha.asc())
            .all()
        )

        return jsonify({
            "operator_id": operator.id,
            "name": operator.name,
            "photo_url": operator.photo_url,
            "year": year,
            "month": month,
            "resumen": resumen,
            "producto_principal": principal,
            "diario": diario,
            "actividades": [a.to_dict() for a in actividades],
            "explicacion": (
                "El rendimiento se calcula por producto exacto: cuánto produjiste "
                "por cada hora EFECTIVA de trabajo (horario laboral menos las horas "
                "registradas en otras actividades ese día), comparado contra la "
                "mediana histórica de ese mismo producto entre todos los operarios "
                "que lo hayan fabricado. Si el resultado alcanza o supera el 100% de "
                "ese histórico, el mes clasifica como Alta o Muy Alta y da derecho a "
                "bono de producción."
            ),
        }), 200
    except Exception as e:
        return jsonify({"error": "No se pudo obtener el detalle de rendimiento", "details": str(e)}), 500


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
    date_param = request.args.get("date")  # "YYYY-MM-DD": filtra a un día exacto
    q = OperatorActivity.query.filter_by(operator_id=operator_id)
    if date_param:
        q = q.filter(OperatorActivity.fecha == date.fromisoformat(date_param))
    elif month_param:
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
        tipo = (data.get("tipo") or "otra").strip().lower()
        if tipo not in ("otra", "extra"):
            return jsonify({"error": "El campo 'tipo' debe ser 'otra' o 'extra'"}), 400
        if not fecha_str or horas is None:
            return jsonify({"error": "Faltan campos requeridos (fecha, horas)"}), 400
        fecha = date.fromisoformat(fecha_str)
        user_id = get_jwt_identity()

        existing = OperatorActivity.query.filter_by(operator_id=operator_id, fecha=fecha, tipo=tipo).first()
        if existing:
            existing.horas = float(horas)
            existing.nota = nota
        else:
            existing = OperatorActivity(
                operator_id=operator_id, fecha=fecha, horas=float(horas),
                nota=nota, created_by=user_id, tipo=tipo,
            )
            db.session.add(existing)
        db.session.commit()
        return jsonify(existing.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo registrar la actividad", "details": str(e)}), 500


@performance_bp.route("/operators/activities/<int:activity_id>", methods=["PUT"])
@jwt_required()
def update_operator_activity(activity_id):
    try:
        activity = OperatorActivity.query.get_or_404(activity_id)
        data = request.get_json() or {}
        fecha_str = data.get("fecha")
        horas = data.get("horas")
        nota = data.get("nota")
        tipo = data.get("tipo")

        if tipo is not None:
            tipo = tipo.strip().lower()
            if tipo not in ("otra", "extra"):
                return jsonify({"error": "El campo 'tipo' debe ser 'otra' o 'extra'"}), 400
            activity.tipo = tipo
        if fecha_str:
            activity.fecha = date.fromisoformat(fecha_str)
        if horas is not None:
            activity.horas = float(horas)
        if nota is not None:
            activity.nota = nota.strip()

        db.session.commit()
        return jsonify(activity.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo actualizar la actividad", "details": str(e)}), 500


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