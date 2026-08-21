from app import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import date

# DESPUÉS
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    recovery_code = db.Column(db.String(6), nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)
    update_code = db.Column(db.String(6), nullable=True)  # código para confirmar edición de perfil
    is_admin = db.Column(db.Boolean, nullable=False, default=False)  # administrador "gestor": stock, operarios, choferes, notificaciones
    is_super_admin = db.Column(db.Boolean, nullable=False, default=False)  # administrador completo y real: pagos, bloqueos, y puede otorgar is_admin
    subscription_paid_until = db.Column(db.Date, nullable=True)  # última fecha cubierta (ej.: 2025-09-08)
    due_day = db.Column(db.Integer, nullable=False, default=8)   # día de corte (8)
    receive_notifications = db.Column(db.Boolean, nullable=False, default=True) # Suscripción a notificaciones (maestro)
    can_edit_stock = db.Column(db.Boolean, nullable=False, default=False) # Permiso para editar stock manualmente
    notify_low_stock = db.Column(db.Boolean, nullable=False, default=True) # Recibir notificaciones de stock bajo
    notify_pending_dispatches = db.Column(db.Boolean, nullable=False, default=True) # Recibir notificaciones de despachos retrasados
    gender = db.Column(db.String(1), nullable=True)  # 'm' = masculino, 'f' = femenino, None = sin definir
    # Vínculo con la identidad de empleado (mutuamente excluyentes): un
    # usuario puede ser operario, chofer, o ninguno de los dos (usuario
    # normal, todo habilitado). Se establece con un clic desde el panel
    # de administración — reemplaza las listas de correos hardcodeadas.
    linked_operator_id = db.Column(db.Integer, db.ForeignKey('operator.id', ondelete='SET NULL'), nullable=True)
    linked_driver_id = db.Column(db.Integer, db.ForeignKey('driver.id', ondelete='SET NULL'), nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)