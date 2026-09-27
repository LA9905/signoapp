from app import db
from sqlalchemy.sql import func

class SurveyResponse(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(36), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id", ondelete="SET NULL"), nullable=True, index=True)
    campaign_key = db.Column(db.String(40), nullable=False, index=True, default="legacy")
    completed = db.Column(db.Boolean, nullable=False, default=False, index=True)
    last_email_sent_at = db.Column(db.DateTime(timezone=True), nullable=True)

    name = db.Column(db.String(120), nullable=True)
    email = db.Column(db.String(120), nullable=True)

    # UI / app
    responsiva = db.Column(db.Integer, nullable=True)           # 1–5
    estilo_colores = db.Column(db.Integer, nullable=True)
    claridad_ui = db.Column(db.Integer, nullable=True)
    intuitiva = db.Column(db.Integer, nullable=True)
    # Producto
    cubre_necesidades = db.Column(db.Integer, nullable=True)
    api_estabilidad = db.Column(db.Integer, nullable=True)
    velocidad_carga = db.Column(db.Integer, nullable=True)
    # Equipo desarrollo
    equipo_atencion = db.Column(db.Integer, nullable=True)
    equipo_errores = db.Column(db.Integer, nullable=True)
    equipo_responsabilidad = db.Column(db.Integer, nullable=True)
    novedades_informadas = db.Column(db.Integer, nullable=True)
    # Global
    satisfaccion_general = db.Column(db.Integer, nullable=True)

    estilo_sugerencia = db.Column(db.Text, nullable=True)
    necesidades_faltantes = db.Column(db.Text, nullable=True)
    ideas_tecnologia = db.Column(db.Text, nullable=True)
    errores_actuales = db.Column(db.Text, nullable=True)
    comentarios_generales = db.Column(db.Text, nullable=True)

    created_at = db.Column(
        db.DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    completed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    def to_dict(self):
        from app.utils.timezone import to_local
        return {
            "id": self.id,
            "campaign_key": self.campaign_key,
            "completed": self.completed,
            "nombre": self.name or "Anónimo",
            "correo": self.email or "No proporcionado",
            "responsiva": self.responsiva,
            "estilo_colores": self.estilo_colores,
            "claridad_ui": self.claridad_ui,
            "intuitiva": self.intuitiva,
            "cubre_necesidades": self.cubre_necesidades,
            "api_estabilidad": self.api_estabilidad,
            "velocidad_carga": self.velocidad_carga,
            "equipo_atencion": self.equipo_atencion,
            "equipo_errores": self.equipo_errores,
            "equipo_responsabilidad": self.equipo_responsabilidad,
            "novedades_informadas": self.novedades_informadas,
            "satisfaccion_general": self.satisfaccion_general,
            "estilo_sugerencia": self.estilo_sugerencia,
            "necesidades_faltantes": self.necesidades_faltantes,
            "ideas_tecnologia": self.ideas_tecnologia,
            "errores_actuales": self.errores_actuales,
            "comentarios": self.comentarios_generales,
            "fecha": to_local(self.created_at).strftime("%d/%m/%Y %H:%M") if self.created_at else None,
        }