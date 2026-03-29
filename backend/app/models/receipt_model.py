from app import db
from datetime import datetime
from app.utils.timezone import utcnow, to_local

class Receipt(db.Model):
    __tablename__ = 'receipt'

    id = db.Column(db.Integer, primary_key=True)
    orden = db.Column(db.String(50), nullable=False)
    supplier_id = db.Column(db.Integer, db.ForeignKey('supplier.id'), nullable=False)
    fecha = db.Column(db.DateTime, default=utcnow)
    created_by = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(30), default='pendiente')

    productos = db.relationship('ReceiptProduct', backref='receipt', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'orden': self.orden,
            'supplier_id': self.supplier_id,
            'fecha': to_local(self.fecha).isoformat(timespec="seconds"),
            'created_by': self.created_by,
            'status': self.status,
            'productos': [p.to_dict() for p in self.productos]
        }


class ReceiptProduct(db.Model):
    __tablename__ = 'receipt_product'

    id = db.Column(db.Integer, primary_key=True)
    receipt_id = db.Column(db.Integer, db.ForeignKey('receipt.id'), nullable=False)
    nombre = db.Column(db.String(100), nullable=False)
    cantidad = db.Column(db.Float, nullable=False)
    unidad = db.Column(db.String(20), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'cantidad': self.cantidad,
            'unidad': self.unidad
        }