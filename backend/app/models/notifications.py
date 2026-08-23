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
from collections import defaultdict
import os
from flask import request
import socket

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
    
    api_url = os.getenv('VITE_API_URL')
    if api_url:
        app.logger.debug(f"Usando VITE_API_URL desde env: {api_url}")
        return f"{api_url}/api/auth/unsubscribe?token={token}"
    
    api_url = app.config.get('VITE_API_URL')
    if api_url and api_url != 'http://127.0.0.1:5000' and 'localhost' not in api_url:
        app.logger.debug(f"Usando VITE_API_URL desde config: {api_url}")
        return f"{api_url}/api/auth/unsubscribe?token={token}"
    
    is_dev = (
        os.getenv("FLASK_ENV") == "development" or
        os.getenv("ENV") == "development" or
        app.config.get("DEBUG", False) or
        '127.0.0.1' in request.host_url or
        'localhost' in request.host_url
    )
    
    if is_dev:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            api_url = f"http://{local_ip}:5000"
            app.logger.info(f"Desarrollo local → IP detectada: {api_url}")
            return f"{api_url}/api/auth/unsubscribe?token={token}"
        except Exception as e:
            app.logger.warning(f"Error detectando IP: {e}")
    
    api_url = 'https://api.signo-app.com'
    app.logger.info(f"Usando producción: {api_url}")
    return f"{api_url}/api/auth/unsubscribe?token={token}"

def is_low_stock(product):
    stock = product.stock
    if stock <= 0:
        return True
    
    cat = product.category
    name_lower = product.name.lower()
    
    # Categorías con umbrales simples
    simple_thresholds = {
        "Bolsas de Basura Negras": 400,
        "Bolsas Transparente Recuperada": 400,
        "Bolsas Camisetas": 10,
        "Bolsas PEAD de Alta Densidad": 300,
        "Bolsas Recuperada de Color": 200,
        "Bolsas con Impresión": 500,
        "Bolsas de Lavandería": 500,
        "Bolsas de Cubierto": 30,
        "Bolsas de Papel Kraft o Blancas": 5,
        "Productos de limpieza, aseo, cocina y higiene": 20,
        "Vasos plásticos": 2000,
        "Vasos de Poli-papel": 5,
        "Vasos Espumados": 3,
        "Vasos PET": 3,
        "Tapas": 3,
        "Envases Bowl de Alimento": 4,
        "Porta-colaciones o envases Plumavit": 4,
        "Film": 8,
        "Prepicados": 10,
        "Brochetas": 60,
        "Pocillos de Degustación": 4,
        "Gorros y Cofias": 30,
        "Productos de Protección y seguridad": 10,
        "Envases contenedores de aluminio": 4,
        "Blondas redondas, rectangulares y capsulas": 8,
        "Servilletas": 5,
        "Otros": 10,
    }
    
    if cat in simple_thresholds:
        return stock <= simple_thresholds[cat]
    
    # Bolsas Virgen Transparente
    if cat == "Bolsas Virgen Transparente":
        units_endings = ['und', 'un']
        kilos_endings = ['kg', 'k']
        if any(name_lower.endswith(end) for end in units_endings):
            return stock <= 500
        elif any(name_lower.endswith(end) for end in kilos_endings):
            return stock <= 25
        return False  # Si no termina en ninguno, no considerar bajo
    
    # Bolsas de Polipropileno
    if cat == "Bolsas de Polipropileno":
        units_endings = ['und', 'un']
        kilos_endings = ['kg', 'k']
        if any(name_lower.endswith(end) for end in units_endings):
            return stock <= 1000
        elif any(name_lower.endswith(end) for end in kilos_endings):
            return stock <= 15
        return False
    
    # Guantes
    if cat == "Guantes":
        guantes_10_keywords = ["nitrilo negro", "nitrilo azul", "vinilo", "latex", "jaspe rosado", "aloe vera"]
        guantes_50_keywords = ["domésticos", "nitrilo verde industrial"]
        guantes_1_keywords = ["guante anticorte"]
        
        if any(keyword in name_lower for keyword in guantes_10_keywords):
            thresh = 10
        elif any(keyword in name_lower for keyword in guantes_50_keywords):
            thresh = 50
        elif any(keyword in name_lower for keyword in guantes_1_keywords):
            thresh = 1
        else:
            thresh = 10  # Default para otros guantes
        
        return stock <= thresh
    
    # Utensilios y platos
    if cat == "Utensilios y platos":
        special_20_names = ["cuchara plástica", "cuchara plástica/postre", "tenedor plástico", "cuchillo plástico"]
        if name_lower in special_20_names:
            thresh = 20
        else:
            thresh = 5
        return stock <= thresh
    
    # Si categoría no reconocida, default a 10
    return stock <= 10

def get_low_stock_products():
    all_products = Product.query.all()
    return [p for p in all_products if is_low_stock(p)]

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

        recipients = User.query.filter(
            User.receive_notifications == True,
            User.notify_low_stock == True
        ).all()
        if not recipients:
            app.logger.info("No hay destinatarios para notificaciones de stock bajo")
            return

        # Agrupar por categoría
        low_by_cat = defaultdict(list)
        for p in products:
            low_by_cat[p.category].append(p)
        
        base_html = """
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                <h2 style="color: #333; text-align: center;">¡Alerta de Stock Bajo! 📉</h2>
                <p style="color: #555;">Hola equipo, hemos detectado productos con stock bajo o negativo. Por favor, revisen lo antes posible para evitar problemas en los despachos.</p>
        """
        
        # Ordenar categorías alfabéticamente, con "Otros" al final si existe
        sorted_cats = sorted([c for c in low_by_cat if c != "Otros"]) + (["Otros"] if "Otros" in low_by_cat else [])
        
        for cat in sorted_cats:
            base_html += f'<h3 style="color: #333; margin-top: 20px;">{cat}</h3>'
            base_html += '<ul style="list-style-type: none; padding: 0;">'
            # Ordenar productos por nombre dentro de la categoría
            sorted_products = sorted(low_by_cat[cat], key=lambda p: p.name)
            for p in sorted_products:
                status = "negativo" if p.stock < 0 else "bajo"
                color = "#d32f2f" if p.stock < 0 else "#e67e22"  # rojo fuerte o naranja oscuro
                base_html += f"""
                    <li style="margin-bottom: 12px; padding: 12px; background: #fff3e0;
                            border-left: 5px solid {color}; border-radius: 4px;">
                        <div style="font-weight: bold; color: #333; margin-bottom: 6px;">
                            {p.name}
                        </div>
                        <div style="color: {color}; font-weight: bold; margin-left: 5px;">
                            Stock {p.stock} ({status})
                        </div>
                    </li>
                """
            base_html += '</ul>'
        
        base_html += """
                <p style="color: #555; text-align: center;">¡Mantengamos el inventario al día! 😊</p>
        """

        for u in recipients:
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

        recipients = User.query.filter(
            User.receive_notifications == True,
            User.notify_pending_dispatches == True
        ).all()
        if not recipients:
            app.logger.info("No hay destinatarios para notificaciones de despachos pendientes")
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

        for u in recipients:
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