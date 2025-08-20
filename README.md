🚚 SignoApp – Gestión de Despachos
Aplicación web para crear y gestionar despachos, incluyendo:

Gestión de productos, clientes y choferes.

Generación de PDF con código de barras.

Seguimiento y edición de despachos.

Perfiles de usuario con avatar almacenado en Cloudinary.

Recuperación y cambio de contraseña mediante código enviado por email.

Rutas protegidas con autenticación JWT.

🛠 Stack Tecnológico
Frontend

React + TypeScript + Vite

Tailwind CSS

Backend

Flask (App Factory)

SQLAlchemy + Flask-Migrate

Flask-JWT-Extended (JWT)

ReportLab (PDF + Code128)

Cloudinary (gestión de imágenes)

Flask-Mail (envío de códigos por email)

Base de Datos

PostgreSQL

Deploy

Render (backend, base de datos y frontend como sitio estático)

📂 Estructura del Proyecto
bash
Copiar
Editar
/backend
│   app/__init__.py        # create_app() + CORS + JWT + migraciones
│   app/models/            # User, Product, Client, Driver, Dispatch...
│   app/routes/            # auth, products, print, drivers, clients, dispatches
│   app/utils/             # mailer, print_utils (PDF)
│   config.py               # configuración principal
│   requirements.txt
│   start.py / wsgi.py
│
/frontend
│   src/                   # Componentes y páginas React + TS
│   public/_redirects      # Netlify/Render routing
│   package.json
🔑 Variables de Entorno
Backend (.env)

env
Copiar
Editar
DATABASE_URL=postgresql://USER:PASS@HOST:5432/DBNAME
SECRET_KEY=...
JWT_SECRET_KEY=...
MAIL_USERNAME=tu_correo@gmail.com
MAIL_PASSWORD=app_password_gmail
MAIL_DEFAULT_SENDER=tu_correo@gmail.com
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
JWT_HOURS=8
Frontend (.env)

env
Copiar
Editar
VITE_API_URL=http://localhost:5000
🚀 Levantar en Local
Backend

bash
Copiar
Editar
cd backend
python -m venv venv

# Activar entorno virtual
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
# bash
source venv/Scripts/activate

pip install -r requirements.txt

# Levantar servidor
python start.py
# o con Flask CLI
export FLASK_APP=app
flask run
Frontend

bash
Copiar
Editar
cd frontend
npm install
npm run dev
# abrir http://localhost:5173
🌐 Deploy en Render
Backend y DB desplegados como servicios independientes.

Frontend desplegado como Static Site apuntando a la API del backend mediante VITE_API_URL.

📜 Licencia
Este proyecto es de uso interno y educativo.
