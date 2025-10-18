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
        
        # Job de debug: corre en 5 seg
        def debug_job():
            with app.app_context():
                app.logger.info("Job de debug ejecutado")
        scheduler.add_job(
            func=debug_job,
            trigger='date',
            run_date=datetime.now(timezone.utc) + timedelta(seconds=5),
            id='debug_job',
            replace_existing=True
        )
        app.logger.info("Job de debug agregado (debug_job)")

        # Prueba: corre en 10 seg - PASA LA APP COMO PARÁMETRO
        scheduler.add_job(
            func=lambda: daily_notifications(app),
            trigger='date',
            run_date=datetime.now(timezone.utc) + timedelta(seconds=10),
            id='test_notification_unique',
            replace_existing=True
        )
        app.logger.info("Job de prueba agregado (test_notification_unique)")

        # Cron diaria - PASA LA APP COMO PARÁMETRO
        scheduler.add_job(
            func=lambda: daily_notifications(app),
            trigger='cron',
            day_of_week='mon-sun',
            hour=10,
            minute=0,
            timezone='America/Santiago',
            id='daily_notifications',
            replace_existing=True
        )
        app.logger.info("Job diario agregado (daily_notifications)")