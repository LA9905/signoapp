# app/models/product_model.py
from app import db

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    created_by = db.Column(db.String(100), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "created_by": self.created_by,
        }
