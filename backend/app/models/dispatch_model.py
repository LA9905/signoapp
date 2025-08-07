from app import db
from datetime import datetime

class Dispatch(db.Model):
    __tablename__ = 'dispatch'

    id = db.Column(db.Integer, primary_key=True)
    orden = db.Column(db.String(50), nullable=False)  # Número de orden de compra
    chofer_id = db.Column(db.Integer, db.ForeignKey('driver.id'), nullable=False)
    cliente_id = db.Column(db.Integer, db.ForeignKey('client.id'), nullable=False)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(50), nullable=False)  # Nombre del usuario autenticado
    status = db.Column(db.String(20), default='pendiente')  # Nuevo campo para estado
    productos = db.relationship('DispatchProduct', backref='dispatch', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'orden': self.orden,
            'chofer_id': self.chofer_id,
            'cliente_id': self.cliente_id,
            'fecha': self.fecha.isoformat(),
            'created_by': self.created_by,
            'status': self.status,  # Incluir el nuevo campo
            'productos': [p.to_dict() for p in self.productos]
        }

class DispatchProduct(db.Model):
    __tablename__ = 'dispatch_product'

    id = db.Column(db.Integer, primary_key=True)
    dispatch_id = db.Column(db.Integer, db.ForeignKey('dispatch.id'), nullable=False)
    nombre = db.Column(db.String(100), nullable=False)  # Nombre del producto
    cantidad = db.Column(db.Float, nullable=False)  # Cantidad (unidades, kilos, litros)
    unidad = db.Column(db.String(20), nullable=False)  # Unidad (unidades, kg, l)

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'cantidad': self.cantidad,
            'unidad': self.unidad
        }