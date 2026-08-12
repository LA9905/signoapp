from app import db

class OperatorActivity(db.Model):
    __tablename__ = 'operator_activity'

    id = db.Column(db.Integer, primary_key=True)
    operator_id = db.Column(db.Integer, db.ForeignKey('operator.id'), nullable=False)
    fecha = db.Column(db.Date, nullable=False)
    horas = db.Column(db.Float, nullable=False, default=0.0)
    nota = db.Column(db.String(200), nullable=True)
    created_by = db.Column(db.String(50), nullable=False)

    operator = db.relationship('Operator', backref=db.backref('activities', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'operator_id': self.operator_id,
            'fecha': self.fecha.isoformat(),
            'horas': self.horas,
            'nota': self.nota,
        }