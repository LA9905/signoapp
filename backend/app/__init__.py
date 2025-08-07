# app/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_migrate import Migrate

db = SQLAlchemy()
jwt = JWTManager()
mail = Mail()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")

    CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    migrate.init_app(app, db)

    # Importar modelos antes de crear tablas
    with app.app_context():
        from .models import user_model, product_model
        db.create_all()

    # Registrar Blueprints
    from .routes.auth_routes import auth_bp
    from .routes.product_routes import product_bp
    from .routes.print_routes import print_bp
    from app.routes.driver_routes import driver_bp
    from .routes.client_routes import client_bp
    from .routes.dispatch_routes import dispatch_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(product_bp, url_prefix="/api")
    app.register_blueprint(print_bp, url_prefix="/api")
    app.register_blueprint(driver_bp, url_prefix='/api')
    app.register_blueprint(client_bp, url_prefix="/api")
    app.register_blueprint(dispatch_bp, url_prefix="/api")

    return app