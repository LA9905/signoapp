from app.models.notifications import notify_low_stock, notify_pending_dispatches
from datetime import datetime, timedelta, timezone
from app.models.user_model import User
from app.models.dispatch_model import Dispatch
from app.models.notification_model import Notification
from app.utils.notifications import create_notification
from app.utils.timezone import to_local
from app import db


def daily_notifications(app):
    """Correos a administración (stock bajo, despachos pendientes). No toca in-app."""
    with app.app_context():
        app.logger.info("Ejecutando daily_notifications - Inicio")
        app.logger.info(f"Usuarios suscritos: {User.query.filter_by(receive_notifications=True).count()}")
        notify_low_stock(app)
        notify_pending_dispatches(app)
        app.logger.info("Ejecutando daily_notifications - Fin")


def notify_drivers_pending_inapp(app):
    """
    Notificaciones IN-APP solo para usuarios chofer (linked_driver_id).
    Independiente de los correos a administración.
    Umbral: más de 7 días sin marcar delivered_client.
    """
    with app.app_context():
        app.logger.info("Ejecutando notify_drivers_pending_inapp - Inicio")
        threshold = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=7)

        pending = (
            Dispatch.query
            .filter(Dispatch.delivered_client == False)
            .filter(Dispatch.fecha < threshold)
            .filter(Dispatch.chofer_id.isnot(None))
            .all()
        )
        app.logger.info(f"Despachos pendientes >7 días: {len(pending)}")

        created = 0
        for d in pending:
            users = User.query.filter_by(linked_driver_id=d.chofer_id).all()
            if not users:
                continue

            oc = d.orden or "—"
            cliente = d.client_name or "—"
            fecha_str = to_local(d.fecha).strftime("%d/%m/%Y")
            title = f"Despacho pendiente > 1 semana (OC {oc})"
            body = (
                f"Tienes un despacho con más de una semana sin marcar como entregado. "
                f"OC: {oc}, Centro de Costo: {cliente}, Fecha: {fecha_str}. "
                f"Marca la entrega o agiliza el despacho para no perjudicar tu rendimiento."
            )

            for u in users:
                # Evitar duplicar si ya hay una no leída para este despacho
                already = False
                for n in Notification.query.filter_by(
                    user_id=u.id, type="driver_pending", is_read=False
                ).all():
                    if (n.meta or {}).get("dispatch_id") == d.id:
                        already = True
                        break
                if already:
                    continue

                create_notification(
                    u.id,
                    "driver_pending",
                    title,
                    body,
                    meta={"dispatch_id": d.id, "orden": oc, "cliente": cliente},
                )
                created += 1

        db.session.commit()
        app.logger.info(f"notify_drivers_pending_inapp - Fin (creadas: {created})")


def init_scheduler(scheduler, app):
    with app.app_context():
        app.logger.info("Inicializando scheduler")

        # Correos a admin
        scheduler.add_job(
            func=lambda: daily_notifications(app),
            trigger="cron",
            day_of_week="mon-fri",
            hour=10,
            minute=0,
            timezone="America/Santiago",
            id="daily_notifications",
            replace_existing=True,
        )
        app.logger.info("Job diario (lunes a viernes) agregado (daily_notifications)")

        # In-app solo para choferes
        scheduler.add_job(
            func=lambda: notify_drivers_pending_inapp(app),
            trigger="cron",
            day_of_week="mon-fri",
            hour=10,
            minute=15,
            timezone="America/Santiago",
            id="inapp_driver_pending",
            replace_existing=True,
        )
        app.logger.info("Job in-app choferes pendientes agregado (inapp_driver_pending)")