from flask import Blueprint, request, jsonify
from app import db
from app.models.credit_note_model import CreditNote, CreditNoteProduct
from app.models.client_model import Client
from app.models.user_model import User
from app.models.product_model import Product
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func
from app.utils.timezone import to_local, to_utc_naive, CL_TZ
from sqlalchemy.exc import IntegrityError
from flask_cors import CORS
from collections import defaultdict

credit_note_bp = Blueprint("credit_notes", __name__)
CORS(
    credit_note_bp,
    resources={r"/*": {"origins": "*"}},
    supports_credentials=True,
)

@credit_note_bp.route("/credit-notes", methods=["POST"])
@jwt_required()
def create_credit_note():
    try:
        data = request.get_json() or {}
        required = ("client", "order_number", "invoice_number", "credit_note_number", "reason", "productos")
        if not all(data.get(k) for k in required) or data.get("productos", []) == []:
            return jsonify({"error": "Faltan campos requeridos"}), 400

        user_id = get_jwt_identity()
        client_name = data["client"]
        order_number = data["order_number"]
        invoice_number = data["invoice_number"]
        credit_note_number = data["credit_note_number"]
        reason = data["reason"]
        productos = data.get("productos", [])

        client_norm = " ".join((client_name or "").strip().split())
        client = Client.query.filter(func.lower(Client.name) == client_norm.lower()).first()
        if not client:
            client = Client(name=client_norm, created_by=user_id)
            db.session.add(client)
            db.session.flush()

        new_credit_note = CreditNote(
            client_id=client.id,
            order_number=order_number,
            invoice_number=invoice_number,
            credit_note_number=credit_note_number,
            reason=reason,
            created_by=user_id,
        )
        new_credit_note.fecha = to_utc_naive(datetime.now(CL_TZ))

        db.session.add(new_credit_note)

        for p in productos:
            if not all(k in p for k in ("nombre", "cantidad", "unidad")):
                return jsonify({"error": "Faltan campos en productos"}), 400

            nombre = (p["nombre"] or "").strip()
            prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
            if not prod_row:
                db.session.add(Product(name=nombre, category="Otros", created_by=user_id, stock=0.0))
                db.session.flush()

            db.session.add(
                CreditNoteProduct(
                    nombre=nombre,
                    cantidad=p["cantidad"],
                    unidad=p["unidad"],
                    credit_note=new_credit_note,
                )
            )

            prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
            if prod_row:
                try:
                    prod_row.stock = float(prod_row.stock or 0) + float(p["cantidad"] or 0)
                except Exception:
                    pass

        db.session.commit()
        return jsonify(new_credit_note.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

@credit_note_bp.route("/credit-notes", methods=["GET"])
@jwt_required()
def get_credit_notes():
    try:
        search_client = (request.args.get("client") or "").lower()
        search_order = (request.args.get("order_number") or "").lower()
        search_invoice = (request.args.get("invoice_number") or "").lower()
        search_credit_note = (request.args.get("credit_note_number") or "").lower()
        search_reason = (request.args.get("reason") or "").lower()
        search_user = (request.args.get("user") or "").lower()
        date_from_str = (request.args.get("date_from") or "").strip()
        date_to_str = (request.args.get("date_to") or "").strip()
        
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 10))
        all_param = request.args.get("all")  #línea para soportar exportación de todos los datos

        query = CreditNote.query

        if search_client:
            query = query.join(Client).filter(db.func.lower(Client.name).like(f"%{search_client}%"))

        if search_order:
            query = query.filter(db.func.lower(CreditNote.order_number).like(f"%{search_order}%"))

        if search_invoice:
            query = query.filter(db.func.lower(CreditNote.invoice_number).like(f"%{search_invoice}%"))

        if search_credit_note:
            query = query.filter(db.func.lower(CreditNote.credit_note_number).like(f"%{search_credit_note}%"))

        if search_reason:
            query = query.filter(db.func.lower(CreditNote.reason).like(f"%{search_reason}%"))

        if search_user:
            query = query.join(User, User.id == CreditNote.created_by).filter(
                db.func.lower(User.name).like(f"%{search_user}%")
            )

        if date_from_str and date_to_str:
            try:
                d_from = datetime.strptime(date_from_str, "%Y-%m-%d")
                d_to = datetime.strptime(date_to_str, "%Y-%m-%d")
                if d_from > d_to:
                    d_from, d_to = d_to, d_from
                start_local = d_from.replace(tzinfo=CL_TZ)
                end_local = (d_to + timedelta(days=1)).replace(tzinfo=CL_TZ)
                a_start = to_utc_naive(start_local)
                a_end = to_utc_naive(end_local)
                query = query.filter(CreditNote.fecha >= a_start, CreditNote.fecha < a_end)
            except ValueError:
                return jsonify({"error": "Formato de fecha inválido"}), 400

        query = query.order_by(CreditNote.fecha.asc())

        # Aplicar paginación o fetching completo según parámetro 'all'
        if all_param:
            credit_notes = query.all()
        else:
            credit_notes = query.paginate(page=page, per_page=limit, error_out=False).items

        result = []
        for cn in credit_notes:
            client = Client.query.get(cn.client_id)
            creator = User.query.get(cn.created_by)
            result.append(
                {
                    "id": cn.id,
                    "client": client.name if client else str(cn.client_id),
                    "order_number": cn.order_number,
                    "invoice_number": cn.invoice_number,
                    "credit_note_number": cn.credit_note_number,
                    "reason": cn.reason,
                    "created_by": creator.name if creator else cn.created_by,
                    "fecha": to_local(cn.fecha).isoformat(timespec="seconds"),
                    "productos": [
                        {"nombre": p.nombre, "cantidad": p.cantidad, "unidad": p.unidad} for p in cn.productos
                    ],
                }
            )
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500
    
@credit_note_bp.route("/credit-notes/<int:credit_note_id>", methods=["DELETE"])
@jwt_required()
def delete_credit_note(credit_note_id):
    try:
        credit_note = CreditNote.query.get_or_404(credit_note_id)
        
        # Revertir stock (resta porque se revierte el reingreso)
        for product in credit_note.productos:
            prod_row = Product.query.filter(func.lower(Product.name) == func.lower(product.nombre)).first()
            if prod_row:
                try:
                    prod_row.stock = float(prod_row.stock or 0) - float(product.cantidad or 0)
                    if prod_row.stock < 0:
                        prod_row.stock = 0
                except Exception:
                    pass

        for product in credit_note.productos:
            db.session.delete(product)

        db.session.delete(credit_note)
        db.session.commit()

        return jsonify({"message": "Nota de crédito eliminada y stock revertido"}), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "No se puede eliminar porque está referenciada"}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo eliminar", "details": str(e)}), 500
    
@credit_note_bp.route("/credit-notes/<int:credit_note_id>", methods=["PUT"])
@jwt_required()
def update_credit_note(credit_note_id):
    try:
        data = request.get_json() or {}
        required = ("client", "order_number", "invoice_number", "credit_note_number", "reason", "productos")
        if not all(data.get(k) for k in required):
            return jsonify({"error": "Faltan campos requeridos"}), 400

        credit_note = CreditNote.query.get_or_404(credit_note_id)
        user_id = get_jwt_identity()

        # Actualizar client
        client_name = data["client"]
        client_norm = " ".join((client_name or "").strip().split())
        client = Client.query.filter(func.lower(Client.name) == client_norm.lower()).first()
        if not client:
            client = Client(name=client_norm, created_by=user_id)
            db.session.add(client)
            db.session.flush()
        credit_note.client_id = client.id

        # Actualizar otros campos
        credit_note.order_number = data["order_number"]
        credit_note.invoice_number = data["invoice_number"]
        credit_note.credit_note_number = data["credit_note_number"]
        credit_note.reason = data["reason"]

        # Stock: similar a update en production
        old_qty_by_name = defaultdict(float)
        for p in credit_note.productos:
            old_qty_by_name[p.nombre] += float(p.cantidad or 0)

        for product in credit_note.productos:
            db.session.delete(product)

        new_qty_by_name = defaultdict(float)
        for p in data["productos"]:
            if not all(k in p for k in ("nombre", "cantidad", "unidad")):
                db.session.rollback()
                return jsonify({"error": "Faltan campos en productos"}), 400
            nombre = (p["nombre"] or "").strip()
            prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
            if not prod_row:
                db.session.add(Product(name=nombre, category="Otros", created_by=user_id, stock=0.0))
            new_qty_by_name[nombre] += float(p["cantidad"] or 0)

        db.session.flush()

        all_names = set(old_qty_by_name.keys()) | set(new_qty_by_name.keys())
        for nombre in all_names:
            old_q = old_qty_by_name[nombre]
            new_q = new_qty_by_name[nombre]
            delta = new_q - old_q
            if delta != 0:
                prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
                if prod_row:
                    prod_row.stock = float(prod_row.stock or 0) + delta
                    if prod_row.stock < 0:
                        prod_row.stock = 0

        for p in data["productos"]:
            nombre = (p["nombre"] or "").strip()
            db.session.add(
                CreditNoteProduct(
                    nombre=nombre,
                    cantidad=p["cantidad"],
                    unidad=p["unidad"],
                    credit_note=credit_note,
                )
            )

        db.session.commit()
        return jsonify(credit_note.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo actualizar", "details": str(e)}), 500