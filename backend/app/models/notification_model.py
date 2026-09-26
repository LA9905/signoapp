from app import db
from app.utils.timezone import utcnow, to_local

class Notification(db.Model):
    __tablename__ = "user_notification"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    # Tipos: dispatch_edit | driver_pending | operator_low | operator_record | monthly_user | monthly_driver | monthly_operator
    type = db.Column(db.String(40), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=False)
    meta = db.Column(db.JSON, nullable=True)
    is_read = db.Column(db.Boolean, nullable=False, default=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    user = db.relationship("User", backref=db.backref("notifications", lazy="dynamic", cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "title": self.title,
            "body": self.body,
            "meta": self.meta or {},
            "is_read": self.is_read,
            "created_at": to_local(self.created_at).isoformat(timespec="seconds"),
        }