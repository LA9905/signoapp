from app import db
from datetime import datetime
from app.utils.timezone import utcnow, to_local

class Dispatch(db.Model):
    __tablename__ = 'dispatch'

    id = db.Column(db.Integer, primary_key=True)
    orden = db.Column(db.String(50), nullable=False)
    chofer_id = db.Column(db.Integer, db.ForeignKey('driver.id', ondelete="SET NULL"), nullable=True)
    chofer_name = db.Column(db.String(100), nullable=False)
    cliente_id = db.Column(db.Integer, db.ForeignKey('client.id'), nullable=False)
    # cliente_name = db.Column(db.String(100), nullable=False)
    # Guardamos UTC naive en DB
    fecha = db.Column(db.DateTime, default=utcnow)
    created_by = db.Column(db.String(50), nullable=False)

    paquete_numero = db.Column(db.String(50), nullable=True)          # p.ej. 1, 2, 3...
    factura_numero = db.Column(db.String(50), nullable=True)       # editable luego del despacho

    # Estado base (compatibilidad)
    status = db.Column(db.String(30), default='pendiente')

    # Hitos irreversibles
    delivered_driver = db.Column(db.Boolean, nullable=False, default=False)
    delivered_client = db.Column(db.Boolean, nullable=False, default=False)
    delivered_driver_at = db.Column(db.DateTime, nullable=True)  # UTC naive
    delivered_client_at = db.Column(db.DateTime, nullable=True)  # UTC naive

    productos = db.relationship('DispatchProduct', backref='dispatch', lazy=True)
    images = db.relationship('DispatchImage', backref='dispatch', lazy=True, cascade="all, delete-orphan")  #Relación con imágenes

    def to_dict(self):
        derived_status = (
            'entregado_cliente' if self.delivered_client else
            'entregado_chofer' if self.delivered_driver else
            (self.status or 'pendiente')
        )
        return {
            'id': self.id,
            'orden': self.orden,
            'chofer_id': self.chofer_id,
            'cliente_id': self.cliente_id,
            'fecha': to_local(self.fecha).isoformat(timespec="seconds"),
            'created_by': self.created_by,
            'status': derived_status,
            'delivered_driver': self.delivered_driver,
            'delivered_client': self.delivered_client,
            'paquete_numero': self.paquete_numero,
            'factura_numero': self.factura_numero,
            'productos': [p.to_dict() for p in self.productos],
            'images': [i.to_dict() for i in self.images]  #Incluir imágenes
        }


class DispatchProduct(db.Model):
    __tablename__ = 'dispatch_product'

    id = db.Column(db.Integer, primary_key=True)
    dispatch_id = db.Column(db.Integer, db.ForeignKey('dispatch.id'), nullable=False)
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

# Modelo para imágenes de despachos
class DispatchImage(db.Model):
    __tablename__ = 'dispatch_image'

    id = db.Column(db.Integer, primary_key=True)
    dispatch_id = db.Column(db.Integer, db.ForeignKey('dispatch.id'), nullable=False)
    image_url = db.Column(db.String(255), nullable=False)  # URL de Cloudinary
    uploaded_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'image_url': self.image_url,
            'uploaded_at': to_local(self.uploaded_at).isoformat(timespec="seconds")
        }