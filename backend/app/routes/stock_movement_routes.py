from flask import Blueprint, request, jsonify
from app import db
from app.models.dispatch_model import Dispatch, DispatchProduct
from app.models.receipt_model import Receipt, ReceiptProduct
from app.models.production_model import Production, ProductionProduct
from app.models.credit_note_model import CreditNote, CreditNoteProduct
from app.models.internal_consumption_model import InternalConsumption, InternalConsumptionProduct
from app.models.supplier_model import Supplier
from app.models.operator_model import Operator
from app.models.user_model import User
from flask_jwt_extended import jwt_required
from datetime import datetime, timedelta
from sqlalchemy import func
from app.routes.product_routes import normalize_search, normalize_db_column
from app.utils.timezone import to_local, to_utc_naive, CL_TZ
from flask_cors import CORS

stock_movement_bp = Blueprint("stock_movements", __name__)
CORS(stock_movement_bp, resources={r"/*": {"origins": "*"}}, supports_credentials=True)


@stock_movement_bp.route("/stock-movements", methods=["GET"])
@jwt_required()
def get_stock_movements():
    try:
        product_name = normalize_search(request.args.get("product") or "")
        client_name  = normalize_search(request.args.get("client") or "")
        date_from_str = (request.args.get("date_from") or "").strip()
        date_to_str = (request.args.get("date_to") or "").strip()

        if not product_name:
            return jsonify({"error": "El parámetro 'product' es requerido"}), 400

        # Calcular rango de fechas en UTC naive
        date_from_utc = None
        date_to_utc = None
        if date_from_str:
            try:
                d_from = datetime.strptime(date_from_str, "%Y-%m-%d")
                date_from_utc = to_utc_naive(d_from.replace(hour=0, minute=0, second=0, tzinfo=CL_TZ))
            except ValueError:
                return jsonify({"error": "Formato de date_from inválido, use YYYY-MM-DD"}), 400
        if date_to_str:
            try:
                d_to = datetime.strptime(date_to_str, "%Y-%m-%d")
                date_to_utc = to_utc_naive((d_to + timedelta(days=1)).replace(hour=0, minute=0, second=0, tzinfo=CL_TZ))
            except ValueError:
                return jsonify({"error": "Formato de date_to inválido, use YYYY-MM-DD"}), 400

        movements = []

        # ── 1. DESPACHOS (salida) ──
        dispatch_q = db.session.query(DispatchProduct, Dispatch).join(
            Dispatch, DispatchProduct.dispatch_id == Dispatch.id
        ).filter(normalize_db_column(DispatchProduct.nombre) == product_name)
        if client_name:
            dispatch_q = dispatch_q.filter(normalize_db_column(Dispatch.client_name) == client_name)
        if date_from_utc:
            dispatch_q = dispatch_q.filter(Dispatch.fecha >= date_from_utc)
        if date_to_utc:
            dispatch_q = dispatch_q.filter(Dispatch.fecha < date_to_utc)

        for dp, d in dispatch_q.all():
            movements.append({
                "tipo": "salida",
                "origen": "Despacho",
                "fecha": to_local(d.fecha).isoformat(timespec="seconds"),
                "cantidad": dp.cantidad,
                "unidad": dp.unidad,
                "detalle": {
                    "cliente": d.client_name,
                    "orden": d.orden,
                    "factura": d.factura_numero or "",
                },
            })

        # ── 2. CONSUMO INTERNO (salida) ──
        internal_q = db.session.query(InternalConsumptionProduct, InternalConsumption).join(
            InternalConsumption,
            InternalConsumptionProduct.internal_consumption_id == InternalConsumption.id
        ).filter(normalize_db_column(InternalConsumptionProduct.nombre) == product_name)
        if date_from_utc:
            internal_q = internal_q.filter(InternalConsumption.fecha >= date_from_utc)
        if date_to_utc:
            internal_q = internal_q.filter(InternalConsumption.fecha < date_to_utc)

        if not client_name:
            for ip, ic in internal_q.all():
                movements.append({
                    "tipo": "salida",
                    "origen": "Consumo Interno",
                    "fecha": to_local(ic.fecha).isoformat(timespec="seconds"),
                    "cantidad": ip.cantidad,
                    "unidad": ip.unidad,
                    "detalle": {
                        "nombre_retira": ic.nombre_retira,
                        "area": ic.area,
                        "motivo": ic.motivo,
                    },
                })


        # ── 3. RECEPCIÓN DE PROVEEDOR (entrada) ──
        receipt_q = db.session.query(ReceiptProduct, Receipt, Supplier).join(
            Receipt, ReceiptProduct.receipt_id == Receipt.id
        ).join(Supplier, Receipt.supplier_id == Supplier.id).filter(
            normalize_db_column(ReceiptProduct.nombre) == product_name
        )
        if date_from_utc:
            receipt_q = receipt_q.filter(Receipt.fecha >= date_from_utc)
        if date_to_utc:
            receipt_q = receipt_q.filter(Receipt.fecha < date_to_utc)
        
        if not client_name:
            for rp, r, s in receipt_q.all():
                movements.append({
                    "tipo": "entrada",
                    "origen": "Recepción Proveedor",
                    "fecha": to_local(r.fecha).isoformat(timespec="seconds"),
                    "cantidad": rp.cantidad,
                    "unidad": rp.unidad,
                    "detalle": {
                        "proveedor": s.name,
                        "orden": r.orden,
                    },
                })

        # ── 4. PRODUCCIÓN (entrada) ──
        production_q = db.session.query(ProductionProduct, Production, Operator).join(
            Production, ProductionProduct.production_id == Production.id
        ).join(Operator, Production.operator_id == Operator.id).filter(
            normalize_db_column(ProductionProduct.nombre) == product_name
        )
        if date_from_utc:
            production_q = production_q.filter(Production.fecha >= date_from_utc)
        if date_to_utc:
            production_q = production_q.filter(Production.fecha < date_to_utc)

        if not client_name:
            for pp, prod, op in production_q.all():
                movements.append({
                    "tipo": "entrada",
                    "origen": "Producción",
                    "fecha": to_local(prod.fecha).isoformat(timespec="seconds"),
                    "cantidad": pp.cantidad,
                    "unidad": pp.unidad,
                    "detalle": {
                        "operario": op.name,
                    },
                })

        # ── 5. NOTA DE CRÉDITO (entrada) ──
        cn_q = db.session.query(CreditNoteProduct, CreditNote).join(
            CreditNote, CreditNoteProduct.credit_note_id == CreditNote.id
        ).filter(normalize_db_column(CreditNoteProduct.nombre) == product_name)
        if client_name:
            cn_q = cn_q.filter(normalize_db_column(CreditNote.client_name) == client_name)
        if date_from_utc:
            cn_q = cn_q.filter(CreditNote.fecha >= date_from_utc)
        if date_to_utc:
            cn_q = cn_q.filter(CreditNote.fecha < date_to_utc)

        for cnp, cn in cn_q.all():
            movements.append({
                "tipo": "entrada",
                "origen": "Nota de Crédito",
                "fecha": to_local(cn.fecha).isoformat(timespec="seconds"),
                "cantidad": cnp.cantidad,
                "unidad": cnp.unidad,
                "detalle": {
                    "cliente": cn.client_name,
                    "orden": cn.order_number,
                    "factura": cn.invoice_number,
                    "nota_credito": cn.credit_note_number,
                },
            })

        # Ordenar por fecha ascendente
        movements.sort(key=lambda x: x["fecha"])

        return jsonify(movements), 200

    except Exception as e:
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500