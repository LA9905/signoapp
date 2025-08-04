from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from .routes.print_routes import print_bp
from flask_migrate import Migrate

db = SQLAlchemy()
jwt = JWTManager()
mail = Mail()
migrate = Migrate()  

def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")

    CORS(app)
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    migrate.init_app(app, db)

    # Blueprints se registran aquí dentro
    from .routes.auth_routes import auth_bp
    from .routes.product_routes import product_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(product_bp, url_prefix="/api")  # ✅ Ahora sí, app ya existe
    app.register_blueprint(print_bp)

    with app.app_context():
        db.create_all()

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)