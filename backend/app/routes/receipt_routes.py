from flask import Blueprint, request, jsonify
from app import db
from app.models.receipt_model import Receipt, ReceiptProduct
from app.models.supplier_model import Supplier
from app.models.user_model import User
from app.models.product_model import Product
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func
from app.utils.timezone import to_local, to_utc_naive, CL_TZ
from sqlalchemy.exc import IntegrityError
from flask_cors import CORS
from collections import defaultdict

receipt_bp = Blueprint("receipts", __name__)
CORS(
    receipt_bp,
    resources={r"/*": {"origins": "*"}},
    supports_credentials=True,
)

@receipt_bp.route("/receipts", methods=["POST"])
@jwt_required()
def create_receipt():
    try:
        data = request.get_json() or {}
        if not data.get("orden") or not data.get("supplier") or data.get("productos", []) == []:
            return jsonify({"error": "Faltan campos requeridos (orden, supplier, productos)"}), 400

        user_id = get_jwt_identity()
        orden = data["orden"]
        supplier_name = data["supplier"]
        productos = data.get("productos", [])
        force = data.get("force", False)  # Nuevo parámetro para forzar creación

        supplier_norm = " ".join((supplier_name or "").strip().split())
        supplier = Supplier.query.filter(func.lower(Supplier.name) == supplier_norm.lower()).first()
        if not supplier:
            supplier = Supplier(name=supplier_norm, created_by=user_id)
            db.session.add(supplier)
            db.session.flush()

        # Verificar si la orden ya existe, excluyendo casos donde force se usa para sobrescribir
        existing = Receipt.query.filter_by(orden=orden).first()
        if existing and not force:
            return jsonify({"error": "duplicate_order", "msg": "Ya existe una orden con ese número. Confirme para continuar."}), 409

        new_receipt = Receipt(
            orden=orden,
            supplier_id=supplier.id,
            created_by=user_id,
        )
        new_receipt.fecha = to_utc_naive(datetime.now(CL_TZ))

        db.session.add(new_receipt)

        for p in productos:
            if not all(k in p for k in ("nombre", "cantidad", "unidad")):
                return jsonify({"error": "Faltan campos en productos (nombre, cantidad, unidad)"}), 400

            nombre = (p["nombre"] or "").strip()
            prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
            if not prod_row:
                db.session.add(Product(name=nombre, category="Otros", created_by=user_id, stock=0.0))
                db.session.flush()

            db.session.add(
                ReceiptProduct(
                    nombre=nombre,
                    cantidad=p["cantidad"],
                    unidad=p["unidad"],
                    receipt=new_receipt,
                )
            )

            prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
            if prod_row:
                try:
                    prod_row.stock = float(prod_row.stock or 0) + float(p["cantidad"] or 0)
                except Exception:
                    pass

        db.session.commit()
        return jsonify(new_receipt.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

@receipt_bp.route("/receipts", methods=["GET"])
@jwt_required()
def get_receipts():
    try:
        search_supplier = (request.args.get("supplier") or "").lower()
        search_order = (request.args.get("order") or "").lower()
        search_user = (request.args.get("user") or "").lower()
        date_from_str = (request.args.get("date_from") or "").strip()
        date_to_str = (request.args.get("date_to") or "").strip()
        
        # Paginación
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 10))

        query = Receipt.query

        if search_supplier:
            query = query.join(Supplier).filter(db.func.lower(Supplier.name).like(f"%{search_supplier}%"))

        if search_order:
            query = query.filter(db.func.lower(Receipt.orden).like(f"%{search_order}%"))

        if search_user:
            query = query.join(User, User.id == Receipt.created_by).filter(
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
                query = query.filter(Receipt.fecha >= a_start, Receipt.fecha < a_end)
            except ValueError:
                return jsonify({"error": "Formato de fecha inválido en date_from/date_to, use YYYY-MM-DD"}), 400

        query = query.order_by(Receipt.fecha.asc())

        # Aplicar paginación
        receipts = query.paginate(page=page, per_page=limit, error_out=False).items

        result = []
        for r in receipts:
            supplier = Supplier.query.get(r.supplier_id)
            creator = User.query.get(r.created_by)
            result.append(
                {
                    "id": r.id,
                    "orden": r.orden,
                    "supplier": supplier.name if supplier else str(r.supplier_id),
                    "created_by": creator.name if creator else r.created_by,
                    "fecha": to_local(r.fecha).isoformat(timespec="seconds"),
                    "status": r.status or 'pendiente',
                    "productos": [
                        {"nombre": p.nombre, "cantidad": p.cantidad, "unidad": p.unidad} for p in r.productos
                    ],
                }
            )
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500
    
@receipt_bp.route("/receipts/<int:receipt_id>", methods=["DELETE"])
@jwt_required()
def delete_receipt(receipt_id):
    try:
        receipt = Receipt.query.get_or_404(receipt_id)
        
        # Revertir el stock de los productos
        for product in receipt.productos:
            prod_row = Product.query.filter(func.lower(Product.name) == func.lower(product.nombre)).first()
            if prod_row:
                try:
                    prod_row.stock = float(prod_row.stock or 0) - float(product.cantidad or 0)
                    if prod_row.stock < 0:
                        prod_row.stock = 0  # Evitar stock negativo
                except Exception:
                    pass  # Manejo básico, podrías loguear esto

        # Eliminar los productos de la recepción
        for product in receipt.productos:
            db.session.delete(product)

        # Eliminar la recepción
        db.session.delete(receipt)
        db.session.commit()

        return jsonify({"message": "Recepción eliminada y stock revertido"}), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "No se puede eliminar la recepción porque está referenciada por otros registros"}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo eliminar la recepción", "details": str(e)}), 500
    
@receipt_bp.route("/receipts/<int:receipt_id>", methods=["PUT"])
@jwt_required()
def update_receipt(receipt_id):
    try:
        data = request.get_json() or {}
        if not data.get("orden") or not data.get("supplier") or not data.get("productos"):
            return jsonify({"error": "Faltan campos requeridos (orden, supplier, productos)"}), 400

        receipt = Receipt.query.get_or_404(receipt_id)
        user_id = get_jwt_identity()

        # Actualizar proveedor
        supplier_name = data["supplier"]
        supplier_norm = " ".join((supplier_name or "").strip().split())
        supplier = Supplier.query.filter(func.lower(Supplier.name) == supplier_norm.lower()).first()
        if not supplier:
            supplier = Supplier(name=supplier_norm, created_by=user_id)
            db.session.add(supplier)
            db.session.flush()
        receipt.supplier_id = supplier.id

        # Actualizar orden
        receipt.orden = data["orden"]

        if "status" in data:
            receipt.status = data["status"]

        # Calcular cantidades antiguas sumadas por nombre
        old_qty_by_name = defaultdict(float)
        for p in receipt.productos:
            old_qty_by_name[p.nombre] += float(p.cantidad or 0)

        # Eliminar productos existentes
        for product in receipt.productos:
            db.session.delete(product)

        # Crear productos nuevos si no existen y preparar nuevas cantidades sumadas
        new_qty_by_name = defaultdict(float)
        for p in data["productos"]:
            if not all(k in p for k in ("nombre", "cantidad", "unidad")):
                db.session.rollback()
                return jsonify({"error": "Faltan campos en productos (nombre, cantidad, unidad)"}), 400
            nombre = (p["nombre"] or "").strip()
            prod_row = Product.query.filter(func.lower(Product.name) == nombre.lower()).first()
            if not prod_row:
                db.session.add(Product(name=nombre, category="Otros", created_by=user_id, stock=0.0))
            new_qty_by_name[nombre] += float(p["cantidad"] or 0)

        db.session.flush()  # Asegurar que nuevos productos estén en DB

        # Ajustar stock para todos los nombres involucrados
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

        # Agregar nuevos productos al receipt
        for p in data["productos"]:
            nombre = (p["nombre"] or "").strip()
            db.session.add(
                ReceiptProduct(
                    nombre=nombre,
                    cantidad=p["cantidad"],
                    unidad=p["unidad"],
                    receipt=receipt,
                )
            )

        db.session.commit()
        return jsonify(receipt.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "No se pudo actualizar la recepción", "details": str(e)}), 500