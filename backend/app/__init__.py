import os
import logging
logging.getLogger('apscheduler').setLevel(logging.DEBUG)
from datetime import timedelta, datetime
from flask import Flask, send_from_directory, request, jsonify, current_app
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager, verify_jwt_in_request, get_jwt_identity
from flask_mail import Mail, Message
from flask_migrate import Migrate
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
from werkzeug.serving import is_running_from_reloader
import cloudinary
import cloudinary.uploader


db = SQLAlchemy()
jwt = JWTManager()
mail = Mail()
migrate = Migrate()


def _str_to_bool(v: str, default: bool = False) -> bool:
    if v is None:
        return default
    return str(v).strip().lower() in ("1", "true", "t", "yes", "y")


def create_app():
    # Carga .env desde el root del proyecto
    load_dotenv()

    app = Flask(__name__)
    try:
        app.config.from_object("config.Config")
    except Exception:
        pass

    app.logger.setLevel(logging.INFO)

    # Configuración general de correo + notificaciones
    app.config.update(
        MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
        MAIL_PORT=int(os.getenv("MAIL_PORT", "587")),
        MAIL_USE_TLS=_str_to_bool(os.getenv("MAIL_USE_TLS", "true"), True),
        MAIL_USE_SSL=_str_to_bool(os.getenv("MAIL_USE_SSL", "false"), False),
        MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
        MAIL_PASSWORD=(os.getenv("MAIL_PASSWORD") or "").strip(),
        MAIL_DEFAULT_SENDER=os.getenv("MAIL_DEFAULT_SENDER") or os.getenv("MAIL_USERNAME"),
        MAIL_SUPPRESS_SEND=_str_to_bool(os.getenv("MAIL_SUPPRESS_SEND", "false"), False),

        # Configuración separada para notificaciones
        NOTIF_MAIL_SERVER=os.getenv("NOTIF_MAIL_SERVER", "smtp.gmail.com"),
        NOTIF_MAIL_PORT=int(os.getenv("NOTIF_MAIL_PORT", "587")),
        NOTIF_MAIL_USE_TLS=_str_to_bool(os.getenv("NOTIF_MAIL_USE_TLS", "true"), True),
        NOTIF_MAIL_USE_SSL=_str_to_bool(os.getenv("NOTIF_MAIL_USE_SSL", "false"), False),
        NOTIF_MAIL_USERNAME=os.getenv("NOTIF_MAIL_USERNAME"),
        NOTIF_MAIL_PASSWORD=(os.getenv("NOTIF_MAIL_PASSWORD") or "").strip(),
        NOTIF_MAIL_DEFAULT_SENDER=os.getenv("NOTIF_MAIL_DEFAULT_SENDER") or os.getenv("NOTIF_MAIL_USERNAME"),
        
    )

    app.config['VITE_API_URL'] = os.getenv('VITE_API_URL', 'http://localhost:5000')

    # Configuración de Cloudinary
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True
    )

    # CORS
    allowed_origins = [
        "http://localhost:5173",
        "http://192.168.100.6:5173",
        "https://www.signo-app.com",
        "https://signo-app.com",
    ]
    CORS(
        app,
        resources={r"/api/*": {
            "origins": allowed_origins,
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }},
        supports_credentials=True,
    )

    # Inicialización de extensiones
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    migrate.init_app(app, db)

    # Modelos
    with app.app_context():
        from .models import (
            user_model,
            product_model,
            client_model,
            driver_model,
            dispatch_model,
            supplier_model,
            receipt_model,
            operator_model,
            production_model,
            credit_note_model,
        )
        env = os.getenv("FLASK_ENV") or os.getenv("ENV") or "production"
        if env != "production":
            db.create_all()

    # Blueprints
    from .routes.auth_routes import auth_bp
    from .routes.product_routes import product_bp
    from .routes.print_routes import print_bp
    from .routes.driver_routes import driver_bp
    from .routes.client_routes import client_bp
    from .routes.dispatch_routes import dispatch_bp
    from .routes.health_routes import health_bp
    from .routes.billing_routes import billing_bp
    from .routes.supplier_routes import supplier_bp
    from .routes.receipt_routes import receipt_bp
    from .routes.internal_consumption_routes import internal_bp
    from .routes.operator_routes import operator_bp
    from .routes.production_routes import production_bp
    from .routes.credit_note_routes import credit_note_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(product_bp, url_prefix="/api")
    app.register_blueprint(print_bp, url_prefix="/api")
    app.register_blueprint(driver_bp, url_prefix="/api")
    app.register_blueprint(client_bp, url_prefix="/api")
    app.register_blueprint(dispatch_bp, url_prefix="/api")
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(billing_bp, url_prefix="/api")
    app.register_blueprint(supplier_bp, url_prefix="/api")
    app.register_blueprint(receipt_bp, url_prefix="/api")
    app.register_blueprint(internal_bp, url_prefix="/api")
    app.register_blueprint(operator_bp, url_prefix="/api")
    app.register_blueprint(production_bp, url_prefix="/api")
    app.register_blueprint(credit_note_bp, url_prefix="/api")

    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=10)

    # Guard de billing
    @app.before_request
    def enforce_billing_guard():
        path = request.path or ""
        if not path.startswith("/api"):
            return
        if request.method == "OPTIONS":
            return
        allow = (
            path.startswith("/api/auth/")
            or path.startswith("/api/health")
            or path.startswith("/api/billing/")
        )
        if allow:
            return

        try:
            verify_jwt_in_request(optional=True)
        except Exception:
            return
        uid = get_jwt_identity()
        if not uid:
            return

        from app.models.user_model import User
        try:
            uid_val = int(uid)
        except Exception:
            uid_val = uid

        user = User.query.get(uid_val)
        if not user:
            return

        from app.utils.billing import is_blocked
        if is_blocked(user):
            return jsonify({
                "error": "payment_required",
                "msg": "Debe pagar la suscripción para seguir usando la app."
            }), 402

    # Ruta para servir archivos subidos
    @app.route('/uploads/<path:filename>')
    def uploads(filename):
        from pathlib import Path
        base = Path(app.root_path).parent / "uploads"
        return send_from_directory(str(base), filename, max_age=0)

    # Healthcheck SMTP
    @app.get("/api/health/smtp")
    def smtp_health():
        try:
            u = app.config.get("MAIL_USERNAME")
            s = app.config.get("MAIL_SERVER")
            p = app.config.get("MAIL_PORT")
            tls = app.config.get("MAIL_USE_TLS")
            ssl = app.config.get("MAIL_USE_SSL")
            return jsonify({
                "ok": True,
                "server": s, "port": p, "tls": tls, "ssl": ssl,
                "username_present": bool(u),
                "sender": app.config.get("MAIL_DEFAULT_SENDER"),
                "suppressed": app.config.get("MAIL_SUPPRESS_SEND", False),
            })
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)}), 500
        

    @app.get("/api/health/smtp-notif")
    def smtp_notif_health():
        try:
            import smtplib
            server = app.config['NOTIF_MAIL_SERVER']
            port = app.config['NOTIF_MAIL_PORT']
            use_tls = app.config['NOTIF_MAIL_USE_TLS']
            use_ssl = app.config['NOTIF_MAIL_USE_SSL']
            username = app.config['NOTIF_MAIL_USERNAME']
            password = app.config['NOTIF_MAIL_PASSWORD']
            
            if use_ssl:
                smtp = smtplib.SMTP_SSL(server, port)
            else:
                smtp = smtplib.SMTP(server, port)
            
            if use_tls and not use_ssl:
                smtp.starttls()
            
            smtp.login(username, password)
            smtp.quit()
            return jsonify({
                "ok": True,
                "server": server,
                "port": port,
                "tls": use_tls,
                "ssl": use_ssl,
                "username_present": bool(username),
                "sender": app.config.get("NOTIF_MAIL_DEFAULT_SENDER"),
            })
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)}), 500

        # === SCHEDULER: LIMPIEZA DE IMÁGENES ANTIGUAS (CON CONTEXTO) ===
    from app.models.scheduler import init_scheduler
    from zoneinfo import ZoneInfo

    scheduler = BackgroundScheduler(timezone=ZoneInfo('UTC'))

    with app.app_context():
        if not scheduler.running:
            init_scheduler(scheduler, app)
            scheduler.start()

            from app.routes.dispatch_routes import get_public_id
            from app.models.dispatch_model import DispatchImage

            RETENTION_DAYS = int(os.getenv("IMAGE_RETENTION_DAYS", "62"))

            def delete_old_images():
                # FORZAR CONTEXTO DE FLASK EN HILO SEPARADO
                with app.app_context():
                    threshold = datetime.utcnow() - timedelta(days=RETENTION_DAYS)
                    old_images = DispatchImage.query.filter(DispatchImage.uploaded_at < threshold).all()

                    if not old_images:
                        current_app.logger.info("Limpieza: No hay imágenes antiguas.")
                        return

                    current_app.logger.info(f"Limpieza: {len(old_images)} imágenes > {RETENTION_DAYS} días.")
                    deleted_count = 0

                    for img in old_images:
                        public_id = get_public_id(img.image_url)
                        if public_id:
                            try:
                                result = cloudinary.uploader.destroy(public_id)
                                if result.get('result') == 'ok':
                                    deleted_count += 1
                                else:
                                    current_app.logger.warning(f"Cloudinary: {public_id} → {result}")
                            except Exception as e:
                                current_app.logger.error(f"Error Cloudinary {public_id}: {e}")
                        else:
                            current_app.logger.warning(f"public_id no encontrado: {img.image_url}")

                    # Eliminar de DB
                    ids_to_delete = [img.id for img in old_images]
                    if ids_to_delete:
                        db.session.execute(
                            db.delete(DispatchImage).where(DispatchImage.id.in_(ids_to_delete))
                        )
                        db.session.commit()

                    current_app.logger.info(f"LIMPIEZA OK → Cloudinary: {deleted_count}, DB: {len(ids_to_delete)}")

            # PROGRAMAR A LAS 00:00 (Chile) = 03:00 UTC
            scheduler.add_job(
                delete_old_images,
                'cron',
                hour=3, minute=0,
                id='cleanup_old_images',
                replace_existing=True,
                timezone=ZoneInfo('UTC')
            )

            #PRUEBAS LOCALES
            # scheduler.add_job(
            #     delete_old_images,
            #     'interval',
            #     minutes=5,
            #     id='cleanup_old_images',
            #     replace_existing=True
            # )

            current_app.logger.info("Scheduler OK → Limpieza diaria a las 00:00 (Chile)")
            app.logger.info("Scheduler iniciado con timezone UTC")

    return app