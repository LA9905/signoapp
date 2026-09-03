from app import db
from app.utils.timezone import utcnow, to_local

class ProductChange(db.Model):
    __tablename__ = 'product_change'

    id = db.Column(db.Integer, primary_key=True)
    nombre_persona = db.Column(db.String(100), nullable=False)  # chofer/persona que trae y se lleva
    cliente = db.Column(db.String(150), nullable=True)          # opcional
    orden_compra = db.Column(db.String(100), nullable=True)     # opcional
    factura = db.Column(db.String(100), nullable=True)          # opcional
    comentario = db.Column(db.String(255), nullable=True)       # opcional, motivo del cambio
    fecha = db.Column(db.DateTime, default=utcnow)
    created_by = db.Column(db.String(50), nullable=False)

    productos = db.relationship(
        'ProductChangeItem',
        backref='product_change',
        lazy=True,
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            'id': self.id,
            'nombre_persona': self.nombre_persona,
            'cliente': self.cliente,
            'orden_compra': self.orden_compra,
            'factura': self.factura,
            'comentario': self.comentario,
            'fecha': to_local(self.fecha).isoformat(timespec="seconds"),
            'created_by': self.created_by,
            'productos': [p.to_dict() for p in self.productos],
        }


class ProductChangeItem(db.Model):
    __tablename__ = 'product_change_item'

    id = db.Column(db.Integer, primary_key=True)
    product_change_id = db.Column(db.Integer, db.ForeignKey('product_change.id'), nullable=False)
    nombre = db.Column(db.String(100), nullable=False)
    cantidad = db.Column(db.Float, nullable=False)
    unidad = db.Column(db.String(20), nullable=False)
    # "entra": producto que el chofer trae y se queda -> suma al stock
    # "sale" : producto que el chofer se lleva (el cambio) -> resta del stock
    tipo = db.Column(db.String(10), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'cantidad': self.cantidad,
            'unidad': self.unidad,
            'tipo': self.tipo,
        }