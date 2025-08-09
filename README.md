SignoApp – Gestión de Despachos (Flask + React + TS)
Aplicación web para crear y gestionar despachos: productos, clientes, choferes, generación de PDF con código de barras, seguimiento/edición, perfiles de usuario con avatar en Cloudinary, recuperación y cambio de contraseña por código por email, y rutas protegidas con JWT.

Stack
Frontend: React + TypeScript + Vite, Tailwind.

Backend: Flask (factory), SQLAlchemy, Flask-Migrate, JWT, ReportLab (PDF + Code128), Cloudinary (avatars), Flask-Mail (códigos).

DB: PostgreSQL.

Deploy: Render (backend + DB + static site).

Estructura (resumen)
/backend
  app/
    __init__.py         # create_app() + CORS + health
    models/             # User, Product, Client, Driver, Dispatch...
    routes/             # auth, products, print, drivers, clients, dispatches
    utils/              # mailer, print_utils (PDF)
  config.py
  requirements.txt

/frontend
  src/                  # React + TS code (Login, Dashboard, Tracking, EditProfile...)
  public/_redirects     # /* /index.html 200
  package.json

Variables de entorno
Backend (.env)
DATABASE_URL=postgresql://USER:PASS@HOST:5432/DBNAME
SECRET_KEY=...
JWT_SECRET_KEY=...
MAIL_USERNAME=tu_correo@gmail.com
MAIL_PASSWORD=app_password_gmail
MAIL_DEFAULT_SENDER=tu_correo@gmail.com
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
JWT_HOURS=8

Frontend (.env)
VITE_API_URL=http://localhost:5000

Levantar en local (desarrollo)
Backend
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
# crea tablas automáticamente (db.create_all()) o usa migraciones
python start.py

# o con flask:
# export FLASK_APP=app
# flask run

Frontend
cd frontend
npm install
npm run dev
# abre http://localhost:5173
