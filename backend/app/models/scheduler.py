from app.models.notifications import notify_low_stock, notify_pending_dispatches

def init_scheduler(scheduler, app):
    def daily_notifications():
        with app.app_context():
            notify_low_stock()
            notify_pending_dispatches()

    # Ejecutar inmediatamente para probar
    scheduler.add_job(
        func=daily_notifications,
        trigger='date',
        run_date='2025-10-16 23:54:00',  # 11:52 PM hoy, dentro de 2 minutos
        id='test_notification'
    )

    # Programar la tarea para correr todos los días a las 8:00 AM
    scheduler.add_job(
        func=daily_notifications,
        trigger='cron',
        day_of_week='mon-sun',
        hour=8,
        minute=0,
        id='daily_notifications',
        replace_existing=True
    )
