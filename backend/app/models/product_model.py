from app import db
from app.utils.timezone import utcnow, to_local

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    created_by = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, nullable=True, default=utcnow)

    # Quién y cuándo editó por última vez el NOMBRE del producto 
    edited_by = db.Column(db.String(100), nullable=True)
    edited_at = db.Column(db.DateTime, nullable=True)

    # Imagen opcional del producto (URL de Cloudinary)
    image_url = db.Column(db.String(255), nullable=True)

    # stock global
    stock = db.Column(db.Float, nullable=False, default=0.0)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "created_by": self.created_by,
            "created_at": to_local(self.created_at).isoformat(timespec="seconds") if self.created_at else None,
            "edited_by": self.edited_by,
            "edited_at": to_local(self.edited_at).isoformat(timespec="seconds") if self.edited_at else None,
            "image_url": self.image_url,
            "stock": self.stock,
        }