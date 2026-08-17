from app import db
from datetime import datetime
from app.utils.timezone import utcnow, to_local

class DispatchEditLog(db.Model):
    __tablename__ = 'dispatch_edit_log'

    id = db.Column(db.Integer, primary_key=True)
    dispatch_id = db.Column(db.Integer, db.ForeignKey('dispatch.id', ondelete='CASCADE'), nullable=False)
    # Usuario que CREÓ el despacho originalmente — a él se le atribuye la
    # corrección para efectos de rendimiento, sin importar quién edita.
    created_by = db.Column(db.String(50), nullable=False)
    edited_by = db.Column(db.String(50), nullable=True)
    fecha = db.Column(db.DateTime, default=utcnow)
    # Motivos separados por ';' — valores posibles: orden, productos, chofer
    motivos = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'dispatch_id': self.dispatch_id,
            'created_by': self.created_by,
            'edited_by': self.edited_by,
            'fecha': to_local(self.fecha).isoformat(timespec="seconds"),
            'motivos': (self.motivos or '').split(';') if self.motivos else [],
        }