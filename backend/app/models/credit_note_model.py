from app import db
from datetime import datetime
from app.utils.timezone import utcnow, to_local

class CreditNote(db.Model):
    __tablename__ = 'credit_note'

    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('client.id', ondelete="SET NULL"), nullable=True)
    client_name = db.Column(db.String(100), nullable=False)
    order_number = db.Column(db.String(50), nullable=False)
    invoice_number = db.Column(db.String(50), nullable=False)
    credit_note_number = db.Column(db.String(50), nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    fecha = db.Column(db.DateTime, default=utcnow)
    created_by = db.Column(db.String(50), nullable=False)

    productos = db.relationship('CreditNoteProduct', backref='credit_note', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'client_id': self.client_id,
            'order_number': self.order_number,
            'invoice_number': self.invoice_number,
            'credit_note_number': self.credit_note_number,
            'reason': self.reason,
            'fecha': to_local(self.fecha).isoformat(timespec="seconds"),
            'created_by': self.created_by,
            'productos': [p.to_dict() for p in self.productos]
        }


class CreditNoteProduct(db.Model):
    __tablename__ = 'credit_note_product'

    id = db.Column(db.Integer, primary_key=True)
    credit_note_id = db.Column(db.Integer, db.ForeignKey('credit_note.id'), nullable=False)
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