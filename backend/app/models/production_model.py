from app import db
from datetime import datetime
from app.utils.timezone import utcnow, to_local

class Production(db.Model):
    __tablename__ = 'production'

    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.DateTime, default=utcnow)
    operator_id = db.Column(db.Integer, db.ForeignKey('operator.id'), nullable=False)
    created_by = db.Column(db.String(50), nullable=False)

    productos = db.relationship('ProductionProduct', backref='production', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'fecha': to_local(self.fecha).isoformat(timespec="seconds"),
            'operator_id': self.operator_id,
            'created_by': self.created_by,
            'productos': [p.to_dict() for p in self.productos]
        }

class ProductionProduct(db.Model):
    __tablename__ = 'production_product'

    id = db.Column(db.Integer, primary_key=True)
    production_id = db.Column(db.Integer, db.ForeignKey('production.id'), nullable=False)
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