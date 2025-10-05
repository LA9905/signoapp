import os
from datetime import timedelta
from flask import Flask, send_from_directory, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager, verify_jwt_in_request, get_jwt_identity
from flask_mail import Mail
from flask_migrate import Migrate
from dotenv import load_dotenv

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
        pass  # opcional

    # Override/asegura valores críticos desde .env (con tipos correctos)
    app.config.update(
        MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
        MAIL_PORT=int(os.getenv("MAIL_PORT", "587")),
        MAIL_USE_TLS=_str_to_bool(os.getenv("MAIL_USE_TLS", "true"), True),
        MAIL_USE_SSL=_str_to_bool(os.getenv("MAIL_USE_SSL", "false"), False),
        MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
        MAIL_PASSWORD=(os.getenv("MAIL_PASSWORD") or "").strip(),
        MAIL_DEFAULT_SENDER=os.getenv("MAIL_DEFAULT_SENDER") or os.getenv("MAIL_USERNAME"),
        MAIL_SUPPRESS_SEND=_str_to_bool(os.getenv("MAIL_SUPPRESS_SEND", "false"), False),
    )

    # CORS
    allowed_origins = [
        "http://localhost:5173",
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

    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    migrate.init_app(app, db)

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

    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)

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

    @app.route('/uploads/<path:filename>')
    def uploads(filename):
        from pathlib import Path
        base = Path(app.root_path).parent / "uploads"
        return send_from_directory(str(base), filename, max_age=0)

    #healthcheck de SMTP para debug rápido
    @app.get("/api/health/smtp")
    def smtp_health():
        try:
            u = app.config.get("MAIL_USERNAME")
            s = app.config.get("MAIL_SERVER")
            p = app.config.get("MAIL_PORT")
            tls = app.config.get("MAIL_USE_TLS")
            ssl = app.config.get("MAIL_USE_SSL")
            # No se intenta loguear aquí para no bloquear; solo confirmamos config visible
            return jsonify({
                "ok": True,
                "server": s, "port": p, "tls": tls, "ssl": ssl,
                "username_present": bool(u),
                "sender": app.config.get("MAIL_DEFAULT_SENDER"),
                "suppressed": app.config.get("MAIL_SUPPRESS_SEND", False),
            })
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)}), 500

    return app