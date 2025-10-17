from flask_mail import Message
from flask import current_app
from flask_jwt_extended import create_access_token
from app import mail
from app.models.user_model import User
from app.models.product_model import Product
from app.models.dispatch_model import Dispatch
from app.models.client_model import Client
from app.models.driver_model import Driver
from app.models.user_model import User as Creator  # Alias para created_by
from datetime import datetime, timedelta
from sqlalchemy import and_

def send_notification_email(subject, html_body, recipients):
    msg = Message(
        subject,
        sender=current_app.config['NOTIF_MAIL_DEFAULT_SENDER'],
        recipients=recipients,
        html=html_body
    )
    mail.send(msg)

def generate_unsubscribe_link(user_id):
    token = create_access_token(identity=str(user_id), expires_delta=timedelta(days=30))
    return f"{current_app.config['VITE_API_URL']}/api/auth/unsubscribe?token={token}"

def get_low_stock_products():
    return Product.query.filter(and_(Product.stock <= 10, Product.stock >= 0) | (Product.stock < 0)).all()

def get_pending_dispatches():
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    return Dispatch.query.filter(
        Dispatch.delivered_client == False,
        Dispatch.fecha < one_week_ago
    ).all()

def notify_low_stock():
    products = get_low_stock_products()
    if not products:
        return

    users = User.query.filter_by(receive_notifications=True).all()
    if not users:
        return

    recipients = [u.email for u in users]
    html = """
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
        html += f"""
                <li style="margin-bottom: 10px; padding: 10px; background: #fff3e0; border-left: 5px solid {color}; border-radius: 4px;">
                    <strong>{p.name}</strong>: Stock {p.stock} ({status})
                </li>
        """
    html += """
            </ul>
            <p style="color: #555; text-align: center;">¡Mantengamos el inventario al día! 😊</p>
    """
    for u in users:
        unsubscribe_link = generate_unsubscribe_link(u.id)
        html += f'<p style="text-align: center; font-size: 12px; color: #999;"><a href="{unsubscribe_link}" style="color: #007bff;">Cancelar suscripción a notificaciones</a></p>'
    html += """
        </div>
    </body>
    </html>
    """
    send_notification_email("Alerta: Stock Bajo o Negativo en Productos", html, recipients)

def notify_pending_dispatches():
    dispatches = get_pending_dispatches()
    if not dispatches:
        return

    users = User.query.filter_by(receive_notifications=True).all()
    if not users:
        return

    recipients = [u.email for u in users]
    html = """
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
        html += f"""
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
    html += """
            </ul>
            <p style="color: #555; text-align: center;">¡Asegurémonos de que todo llegue a tiempo! 🚚</p>
    """
    for u in users:
        unsubscribe_link = generate_unsubscribe_link(u.id)
        html += f'<p style="text-align: center; font-size: 12px; color: #999;"><a href="{unsubscribe_link}" style="color: #007bff;">Cancelar suscripción a notificaciones</a></p>'
    html += """
        </div>
    </body>
    </html>
    """
    send_notification_email("Alerta: Despachos Pendientes por Más de una Semana", html, recipients)