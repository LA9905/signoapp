from flask import current_app
from flask_mail import Mail, Message
from flask_jwt_extended import create_access_token
from app.models.user_model import User
from app.models.product_model import Product
from app.models.dispatch_model import Dispatch
from app.models.client_model import Client
from app.models.driver_model import Driver
from app.models.user_model import User as Creator
from datetime import datetime, timedelta
from sqlalchemy import and_
from app.utils.timezone import CL_TZ
from zoneinfo import ZoneInfo
import logging
import smtplib
from app import mail 

logging.basicConfig(level=logging.INFO)

def send_notification_email(subject, html_body, recipients, app):
    try:
        server = app.config['NOTIF_MAIL_SERVER']
        port = app.config['NOTIF_MAIL_PORT']
        use_tls = app.config['NOTIF_MAIL_USE_TLS']
        use_ssl = app.config['NOTIF_MAIL_USE_SSL']
        username = app.config['NOTIF_MAIL_USERNAME']
        password = app.config['NOTIF_MAIL_PASSWORD']
        sender = app.config['NOTIF_MAIL_DEFAULT_SENDER']

        msg = Message(
            subject=subject,
            sender=sender,
            recipients=recipients,
            html=html_body
        )
        msg.charset = 'utf-8'  #codificación UTF-8

        if use_ssl:
            smtp = smtplib.SMTP_SSL(server, port)
        else:
            smtp = smtplib.SMTP(server, port)
        
        if use_tls and not use_ssl:
            smtp.starttls()
        
        smtp.login(username, password)
        smtp.sendmail(sender, recipients, msg.as_string().encode('utf-8'))
        smtp.quit()

        app.logger.info(f"✅ Email enviado a {recipients}")
    except Exception as e:
        app.logger.error(f"❌ Error enviando email a {recipients}: {e}")
        raise  # Relanzar excepción

def generate_unsubscribe_link(user_id, app):
    token = create_access_token(identity=str(user_id), expires_delta=timedelta(days=30))
    base_url = app.config.get('VITE_API_URL', 'http://127.0.0.1:5000')
    return f"{base_url}/api/auth/unsubscribe?token={token}"

def get_low_stock_products():
    return Product.query.filter(
        (and_(Product.stock <= 10, Product.stock >= 0)) | (Product.stock < 0)
    ).all()

def get_pending_dispatches():
    now_local = datetime.now(CL_TZ)
    one_week_ago_local = now_local - timedelta(days=7)
    one_week_ago_utc = one_week_ago_local.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)
    return Dispatch.query.filter(
        Dispatch.delivered_client == False, Dispatch.fecha < one_week_ago_utc
    ).all()

def notify_low_stock(app):
    try:
        print("Ejecutando notify_low_stock")
        app.logger.debug("Iniciando notify_low_stock")
        products = get_low_stock_products()
        if not products:
            app.logger.info("No hay productos con stock bajo")
            return

        users = User.query.filter_by(receive_notifications=True).all()
        if not users:
            app.logger.info("No hay usuarios suscritos a notificaciones")
            return

        base_html = """
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                <h2 style="color: #333; text-align: center;">¡Alerta de Stock Bajo! 📉</h2>
                <p style="color: #555;">Hola equipo, hemos detectado productos con stock bajo o negativo. Por favor, revisen lo antes posible para evitar problemas en los despachos.</p>
                <ul style="list-style-type: none; padding: 0;">
        """
        for p in products:
            status = "negativo" if p.stock < 0 else "bajo"
            color = "red" if p.stock < 0 else "orange"
            base_html += f"""
                    <li style="margin-bottom: 10px; padding: 10px; background: #fff3e0; border-left: 5px solid {color}; border-radius: 4px;">
                        <strong>{p.name}</strong>: Stock {p.stock} ({status})
                    </li>
            """
        base_html += """
                </ul>
                <p style="color: #555; text-align: center;">¡Mantengamos el inventario al día! 😊</p>
        """

        for u in users:
            unsubscribe_link = generate_unsubscribe_link(u.id, app)
            full_html = (
                base_html
                + f'<p style="text-align: center; font-size: 12px; color: #999;"><a href="{unsubscribe_link}" style="color: #007bff;">Cancelar suscripción a notificaciones</a></p>'
                + """
            </div>
        </body>
        </html>
            """
            )
            try:
                send_notification_email(
                    "Alerta: Stock Bajo o Negativo en Productos", full_html, [u.email], app
                )
                app.logger.info(f"Email stock bajo enviado a {u.email}")
            except Exception as e:
                app.logger.error(f"Error enviando stock bajo a {u.email}: {str(e)}")
    except Exception as e:
        app.logger.error(f"Error en notify_low_stock: {str(e)}")

def notify_pending_dispatches(app):
    try:
        print("Ejecutando notify_pending_dispatches")
        app.logger.debug("Iniciando notify_pending_dispatches")
        dispatches = get_pending_dispatches()
        if not dispatches:
            app.logger.info("No hay despachos pendientes")
            return

        users = User.query.filter_by(receive_notifications=True).all()
        if not users:
            app.logger.info("No hay usuarios suscritos")
            return

        base_html = """
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                <h2 style="color: #333; text-align: center;">¡Alerta de Despachos Pendientes! ⏰</h2>
                <p style="color: #555;">Hola equipo, estos despachos tienen más de una semana sin ser marcados como "Pedido Entregado". Por favor, investiguen y tomen acción si es necesario.</p>
                <ul style="list-style-type: none; padding: 0;">
        """
        for d in dispatches:
            client = Client.query.get(d.cliente_id)
            driver = Driver.query.get(d.chofer_id)
            creator = Creator.query.get(d.created_by)
            base_html += f"""
                    <li style="margin-bottom: 10px; padding: 10px; background: #fff3e0; border-left: 5px solid orange; border-radius: 4px;">
                        <strong>Orden:</strong> {d.orden}<br>
                        <strong>Factura:</strong> {d.factura_numero or 'N/A'}<br>
                        <strong>Centro de Costo:</strong> {client.name if client else 'Desconocido'}<br>
                        <strong>Chofer:</strong> {driver.name if driver else 'Desconocido'}<br>
                        <strong>Despachado por:</strong> {creator.name if creator else 'Desconocido'}<br>
                        <strong>Fecha:</strong> {d.fecha.isoformat()}<br>
                        <em style="color: red;">Alerta: Posible retraso, contactar al chofer si no fue entregado.</em>
                    </li>
            """
        base_html += """
                </ul>
                <p style="color: #555; text-align: center;">¡Asegurémonos de que todo llegue a tiempo! 🚚</p>
        """

        for u in users:
            unsubscribe_link = generate_unsubscribe_link(u.id, app)
            full_html = (
                base_html
                + f'<p style="text-align: center; font-size: 12px; color: #999;"><a href="{unsubscribe_link}" style="color: #007bff;">Cancelar suscripción a notificaciones</a></p>'
                + """
            </div>
        </body>
        </html>
            """
            )
            try:
                send_notification_email(
                    "Alerta: Despachos Pendientes por Más de una Semana", full_html, [u.email], app
                )
                app.logger.info(f"Email pendientes enviado a {u.email}")
            except Exception as e:
                app.logger.error(f"Error enviando pendientes a {u.email}: {str(e)}")
    except Exception as e:
        app.logger.error(f"Error en notify_pending_dispatches: {str(e)}")