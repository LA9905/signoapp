from app import db
from sqlalchemy.sql import func

class SurveyResponse(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(36), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    responsiva = db.Column(db.Integer, nullable=True)
    estilo_colores = db.Column(db.Integer, nullable=True)
    estilo_sugerencia = db.Column(db.Text, nullable=True)
    cubre_necesidades = db.Column(db.Integer, nullable=True)
    necesidades_faltantes = db.Column(db.Text, nullable=True)
    api_estabilidad = db.Column(db.Integer, nullable=True)
    velocidad_carga = db.Column(db.Integer, nullable=True)
    comentarios_generales = db.Column(db.Text, nullable=True)
    
    # AQUÍ ESTÁ EL FIX
    created_at = db.Column(
        db.DateTime(timezone=True),
        server_default=func.now(),   # ← Esto evita el NULL
        nullable=False,
        index=True
    )

    def to_dict(self):
        from app.utils.timezone import to_local
        return {
            "id": self.id,
            "nombre": self.name or "Anónimo",
            "correo": self.email or "No proporcionado",
            "responsiva": self.responsiva,
            "estilo_colores": self.estilo_colores,
            "estilo_sugerencia": self.estilo_sugerencia,
            "cubre_necesidades": self.cubre_necesidades,
            "necesidades_faltantes": self.necesidades_faltantes,
            "api_estabilidad": self.api_estabilidad,
            "velocidad_carga": self.velocidad_carga,
            "comentarios": self.comentarios_generales,
            "fecha": to_local(self.created_at).strftime("%d/%m/%Y %H:%M")
        }