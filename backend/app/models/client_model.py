from app import db

class Client(db.Model):
    __tablename__ = 'client'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_by = db.Column(db.String(50), nullable=False)  # Similar a Product y Driver

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'created_by': self.created_by
        }