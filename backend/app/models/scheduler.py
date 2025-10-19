from app.models.notifications import notify_low_stock, notify_pending_dispatches
from datetime import datetime, timedelta, timezone
from app.models.user_model import User

def daily_notifications(app):
    with app.app_context():
        app.logger.info("Ejecutando daily_notifications - Inicio")
        app.logger.info(f"Usuarios suscritos: {User.query.filter_by(receive_notifications=True).count()}")
        notify_low_stock(app)
        notify_pending_dispatches(app)
        app.logger.info("Ejecutando daily_notifications - Fin")

def init_scheduler(scheduler, app):
    with app.app_context():
        app.logger.info("Inicializando scheduler")
        
        # Cron diaria de lunes a viernes - PASA LA APP COMO PARÁMETRO
        scheduler.add_job(
            func=lambda: daily_notifications(app),
            trigger='cron',
            day_of_week='mon-fri',
            hour=10,
            minute=0,
            timezone='America/Santiago',
            id='daily_notifications',
            replace_existing=True
        )
        app.logger.info("Job diario (lunes a viernes) agregado (daily_notifications)")