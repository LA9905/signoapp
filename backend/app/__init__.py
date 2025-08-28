# app/__init__.py
from flask import Flask, send_from_directory, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager, verify_jwt_in_request, get_jwt_identity
from flask_mail import Mail
from flask_migrate import Migrate
from datetime import timedelta
import os

# ❌ NO importes User aquí para evitar el ciclo
# from app.models.user_model import User
from app.utils.billing import is_blocked  # este es seguro
# ^ no importa app, así que no genera ciclo

db = SQLAlchemy()
jwt = JWTManager()
mail = Mail()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")

    # ✅ CORS global, con headers y métodos explícitos
    allowed_origins = [
        "http://localhost:5173",          # dev local
        "https://www.signo-app.com",      # front prod con www
        "https://signo-app.com",          # root que redirige a www (por si algo llama directo)
        # "https://signoapp-front.onrender.com",  # opcional, si quieres mantener por transición
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

    # Importa modelos ANTES de cualquier operación que necesite metadata
    with app.app_context():
        from .models import (
            user_model,
            product_model,
            client_model,
            driver_model,
            dispatch_model,
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

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(product_bp, url_prefix="/api")
    app.register_blueprint(print_bp, url_prefix="/api")
    app.register_blueprint(driver_bp, url_prefix="/api")
    app.register_blueprint(client_bp, url_prefix="/api")
    app.register_blueprint(dispatch_bp, url_prefix="/api")
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(billing_bp, url_prefix="/api")

    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)

    # ✅ BLOQUEO CENTRAL
    @app.before_request
    def enforce_billing_guard():
        path = request.path or ""
        if not path.startswith("/api"):
            return  # no API

        # ✅ Deja pasar preflight siempre
        if request.method == "OPTIONS":
            return

        # rutas permitidas aunque impago
        allow = (
            path.startswith("/api/auth/")
            or path.startswith("/api/health")
            or path.startswith("/api/billing/")
        )
        if allow:
            return

        # Si no hay JWT, deja que la ruta responda 401/403
        try:
            verify_jwt_in_request(optional=True)
        except Exception:
            return

        uid = get_jwt_identity()
        if not uid:
            return

        # Import local para evitar ciclos
        from app.models.user_model import User

        # get() tolera string, pero por si acaso lo forzamos a int si corresponde
        try:
            uid_val = int(uid)
        except Exception:
            uid_val = uid

        user = User.query.get(uid_val)
        if not user:
            return

        from app.utils.billing import is_blocked  # seguro (no importa app)
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

    return app
