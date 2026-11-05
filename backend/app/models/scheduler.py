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


def notify_monthly_performance(app):
    """
    Notificaciones IN-APP mensuales de rendimiento (mes anterior).
    Se ejecuta el día 1 de cada mes a las 09:00 Chile.
    """
    with app.app_context():
        from datetime import date
        from calendar import monthrange
        from app.utils.user_performance import evaluar_usuarios_logistica
        from app.utils.driver_performance import evaluar_chofer, is_evaluable_driver
        from app.utils.performance import evaluar_operador
        from app.models.driver_model import Driver
        from app.models.operator_model import Operator
        from app.models.user_model import User

        app.logger.info("Ejecutando notify_monthly_performance - Inicio")

        today = date.today()
        # Mes anterior
        if today.month == 1:
            year, month = today.year - 1, 12
        else:
            year, month = today.year, today.month - 1

        MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
         "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
        month_label = f"{MESES[month]} {year}"

        created = 0

        # ── Usuarios de logística ──
        try:
            users_perf = evaluar_usuarios_logistica(year, month)
            for r in users_perf:
                if not r.get("ratio"):
                    continue
                pct = round(r["ratio"] * 100)
                clasif = r["clasificacion"]
                title = f"Tu rendimiento de {month_label}"
                if clasif in ("muy_alta", "alta"):
                    body = (
                        f"¡Felicitaciones! En {month_label} tuviste un rendimiento del {pct}%. "
                        f"Creaste {r['total_despachos']} despachos con una precisión excelente. "
                        f"¡Sigue así!"
                    )
                elif clasif == "regular":
                    body = (
                        f"En {month_label} tu rendimiento fue del {pct}%. "
                        f"Creaste {r['total_despachos']} despachos. "
                        f"Hay margen de mejora en la precisión de los datos."
                    )
                else:
                    body = (
                        f"En {month_label} tu rendimiento fue del {pct}%. "
                        f"Creaste {r['total_despachos']} despachos, de los cuales {r['editados']} "
                        f"tuvieron que corregirse. Sé más cuidadoso al ingresar los datos."
                    )

                # Buscar usuario por ID
                try:
                    uid = int(r["user_id"])
                except (TypeError, ValueError):
                    continue
                user = User.query.get(uid)
                if not user:
                    continue

                create_notification(
                    uid,
                    "monthly_user",
                    title,
                    body,
                    meta={"year": year, "month": month, "ratio": r["ratio"], "clasificacion": clasif},
                )
                created += 1
        except Exception as e:
            app.logger.error(f"Error en monthly_user: {e}")

        # ── Choferes ──
        try:
            drivers = Driver.query.all()
            for dr in drivers:
                if not is_evaluable_driver(dr.name):
                    continue
                data = evaluar_chofer(dr.id, year, month)
                if data["total_despachos"] == 0:
                    continue
                pct = round(data["ratio"] * 100) if data["ratio"] is not None else 0
                clasif = data["clasificacion"]
                title = f"Tu rendimiento de {month_label}"
                if clasif in ("excelente", "buena"):
                    body = (
                        f"¡Felicitaciones! En {month_label} entregaste el {pct}% de tus despachos "
                        f"({data['entregados']} de {data['total_despachos']}). ¡Excelente trabajo!"
                    )
                elif clasif == "regular":
                    body = (
                        f"En {month_label} entregaste el {pct}% de tus despachos "
                        f"({data['entregados']} de {data['total_despachos']}). "
                        f"Puedes mejorar marcando las entregas a tiempo."
                    )
                else:
                    body = (
                        f"En {month_label} entregaste solo el {pct}% de tus despachos "
                        f"({data['entregados']} de {data['total_despachos']}). "
                        f"Recuerda marcar las entregas para no perjudicar tu rendimiento."
                    )

                # Notificar a usuarios vinculados a este chofer
                users = User.query.filter_by(linked_driver_id=dr.id).all()
                for u in users:
                    create_notification(
                        u.id,
                        "monthly_driver",
                        title,
                        body,
                        meta={"year": year, "month": month, "ratio": data["ratio"], "clasificacion": clasif},
                    )
                    created += 1
        except Exception as e:
            app.logger.error(f"Error en monthly_driver: {e}")

        # ── Operarios ──
        try:
            operators = Operator.query.all()
            for op in operators:
                data = evaluar_operador(op.id, year, month)
                if data["dias_trabajados"] == 0:
                    continue
                pct = round(data["ratio"] * 100) if data["ratio"] is not None else 0
                clasif = data["clasificacion"]
                title = f"Tu rendimiento de {month_label}"
                if clasif in ("extraordinaria", "muy_alta", "alta"):
                    body = (
                        f"¡Felicitaciones! En {month_label} tu rendimiento fue del {pct}%. "
                        f"Trabajaste {data['dias_trabajados']} días con {data['horas_efectivas']} horas efectivas. "
                        f"¡Mereces bono!"
                    )
                elif clasif in ("regular_alta", "regular"):
                    body = (
                        f"En {month_label} tu rendimiento fue del {pct}%. "
                        f"Trabajaste {data['dias_trabajados']} días. "
                        f"Puedes mejorar tu producción por hora."
                    )
                else:
                    body = (
                        f"En {month_label} tu rendimiento fue del {pct}%. "
                        f"Trabajaste {data['dias_trabajados']} días con {data['horas_efectivas']} horas efectivas. "
                        f"Se requiere mejorar la producción."
                    )

                users = User.query.filter_by(linked_operator_id=op.id).all()
                for u in users:
                    create_notification(
                        u.id,
                        "monthly_operator",
                        title,
                        body,
                        meta={"year": year, "month": month, "ratio": data["ratio"], "clasificacion": clasif},
                    )
                    created += 1
        except Exception as e:
            app.logger.error(f"Error en monthly_operator: {e}")

        db.session.commit()
        app.logger.info(f"notify_monthly_performance - Fin (creadas: {created})")


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

        # Notificaciones mensuales de rendimiento (día 1 a las 09:00 Chile)
        scheduler.add_job(
            func=lambda: notify_monthly_performance(app),
            trigger="cron",
            day=1,
            hour=9,
            minute=0,
            timezone="America/Santiago",
            id="monthly_performance",
            replace_existing=True,
        )
        app.logger.info("Job mensual de rendimiento agregado (monthly_performance)")