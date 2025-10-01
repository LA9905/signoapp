from app import db
from datetime import datetime
from app.utils.timezone import utcnow, to_local

class InternalConsumption(db.Model):
    __tablename__ = 'internal_consumption'

    id = db.Column(db.Integer, primary_key=True)
    nombre_retira = db.Column(db.String(100), nullable=False)
    area = db.Column(db.String(50), nullable=False)
    motivo = db.Column(db.String(255), nullable=False)
    fecha = db.Column(db.DateTime, default=utcnow)
    created_by = db.Column(db.String(50), nullable=False)

    productos = db.relationship('InternalConsumptionProduct', backref='internal_consumption', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'nombre_retira': self.nombre_retira,
            'area': self.area,
            'motivo': self.motivo,
            'fecha': to_local(self.fecha).isoformat(timespec="seconds"),
            'created_by': self.created_by,
            'productos': [p.to_dict() for p in self.productos]
        }

class InternalConsumptionProduct(db.Model):
    __tablename__ = 'internal_consumption_product'

    id = db.Column(db.Integer, primary_key=True)
    internal_consumption_id = db.Column(db.Integer, db.ForeignKey('internal_consumption.id'), nullable=False)
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