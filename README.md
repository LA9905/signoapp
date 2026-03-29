🚚 SignoApp – Gestión Integral de Inventarios y Despachos
Aplicación web en producción para la gestión completa de inventarios, despachos y operaciones logísticas, actualmente utilizada por una empresa del rubro logístico e insumos descartables, con modelo de suscripción mensual.. Como desarrollador fullstack, mantengo y actualizo la app para optimizar procesos. Incluye:

Gestión de Entidades Principales: Productos (con categorías, stock y umbrales personalizados para alertas), clientes, choferes, proveedores, operarios y usuarios.
Despachos: Creación, edición en tiempo real, seguimiento con confirmación de entrega, y generación de PDF con códigos de barras (Code128).
Gestión de Inventario:
Recepciones de compras desde proveedores (con órdenes y status).
Producciones internas por operarios (con fechas y cantidades).
Consumos internos (con nombre del retirante, área, motivo y productos).
Notas de crédito para devoluciones (con razones, números de factura/orden y reingreso de stock).

Actualización Automática de Stock: Ingresos (recepciones, producciones, notas de crédito) y egresos (despachos, consumos) ajustan el inventario en tiempo real, previniendo stocks negativos.
Notificaciones Automatizadas: Emails diarios (lunes a viernes, 10:00 AM hora Chile) para alertas de stock bajo/negativo (umbrales por categoría, e.g., 400 bolsas negras, 10 guantes nitrilo) y despachos pendientes (>1 semana sin entrega). Usuarios pueden suscribirse/desuscribirse con enlaces de cancelación en emails.
Gestión de Usuarios: Perfiles con avatares en Cloudinary, recuperación/cambio de contraseña por código email, toggle de notificaciones, y eliminación de cuenta.
Sistema de Facturación: Suscripciones mensuales con bloqueo de acceso post-vencimiento (día de corte configurable), panel admin para marcar pagos (individuales, masivos o globales) y consultar estados.
Mantenimiento Automático: Limpieza diaria de imágenes antiguas de despachos (>62 días) vía Cloudinary y base de datos.
Rutas Protegidas: Autenticación JWT en todos los endpoints, con guards para facturación.

🛠 Stack Tecnológico
Frontend

React + TypeScript + Vite
Tailwind CSS

Backend

Flask (App Factory modular)
SQLAlchemy + Flask-Migrate (ORM y migraciones)
Flask-JWT-Extended (JWT con expiración configurable)
ReportLab (generación de PDF con Code128)
Cloudinary (almacenamiento y gestión de avatares/imágenes)
Flask-Mail (envío de emails para recuperación y notificaciones)
APScheduler (tareas programadas: notificaciones diarias y limpieza de imágenes)
smtplib (envíos de notificaciones con configuración separada)

Base de Datos

PostgreSQL (con manejo de timezones Chile/UTC)

Deploy y Herramientas

Render (backend como web service, PostgreSQL como DB, frontend como static site)
dotenv (carga de variables de entorno)
CORS (orígenes permitidos: localhost, IPs dev, dominio prod)

📂 Estructura del Proyecto
text.
├── backend/
│   ├── app/
│   │   ├── __init__.py          # create_app(), CORS, JWT, migraciones, scheduler init
│   │   ├── config.py            # Configuración principal (claves, DB, mail)
│   │   ├── models/              # Modelos SQLAlchemy: user_model, product_model, client_model, driver_model, dispatch_model, supplier_model, receipt_model, operator_model, production_model, credit_note_model, internal_consumption_model
│   │   ├── routes/              # Blueprints: auth_routes (login, profile, billing), product_routes, print_routes (PDF), driver_routes, client_routes, dispatch_routes, health_routes, billing_routes (suscripciones), supplier_routes, receipt_routes, internal_consumption_routes, operator_routes, production_routes, credit_note_routes
│   │   ├── utils/               # timezone, mailer (envío códigos), print_utils (PDF), billing (guards de pago)
│   │   └── notifications.py     # Lógica de emails para stock bajo y despachos pendientes
│   ├── scheduler.py             # Init y jobs diarios (notificaciones)
│   ├── requirements.txt         # Dependencias: flask, sqlalchemy, jwt, reportlab, cloudinary, apscheduler, etc.
│   ├── start.py                 # Entrada principal del servidor
│   └── wsgi.py                  # Para deploy en Render
├── frontend/
│   ├── src/                     # Componentes React+TS: páginas de despachos, inventario, perfiles, notificaciones
│   ├── public/
│   │   └── _redirects           # Routing para Render/Netlify
│   └── package.json             # Dependencias npm: react, typescript, tailwind, vite
├── .env.example                 # Plantilla de variables de entorno
└── README.md                    # Este archivo
🔑 Variables de Entorno
Backend (.env)
textDATABASE_URL=postgresql://USER:PASS@HOST:5432/DBNAME
SECRET_KEY=tu_clave_secreta
JWT_SECRET_KEY=tu_jwt_secreto
JWT_HOURS=10

# Mail para recuperación/códigos
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USE_SSL=false
MAIL_USERNAME=tu_correo@gmail.com
MAIL_PASSWORD=app_password_gmail
MAIL_DEFAULT_SENDER=tu_correo@gmail.com
MAIL_SUPPRESS_SEND=false  # true en dev para no enviar emails reales

# Mail separado para notificaciones (recomendado)
NOTIF_MAIL_SERVER=smtp.gmail.com
NOTIF_MAIL_PORT=587
NOTIF_MAIL_USE_TLS=true
NOTIF_MAIL_USE_SSL=false
NOTIF_MAIL_USERNAME=tu_correo_notif@gmail.com
NOTIF_MAIL_PASSWORD=app_password_notif
NOTIF_MAIL_DEFAULT_SENDER=tu_correo_notif@gmail.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Opcional: Retención de imágenes
IMAGE_RETENTION_DAYS=62

# Entorno
FLASK_ENV=production  # o development
ENV=production
VITE_API_URL=https://tu-api.render.com  # URL de la API en prod
Frontend (.env)
textVITE_API_URL=http://localhost:5000  # Cambiar a prod en deploy
🚀 Levantar en Local
Backend
Bashcd backend
python -m venv venv

# Activar entorno virtual
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
# bash
source venv/Scripts/activate

pip install -r requirements.txt
flask db upgrade  # Si usas migraciones

# Levantar servidor
python start.py
# O con Flask CLI
export FLASK_APP=app
flask run
Frontend.
Bashcd frontend
npm install
npm run dev
Abrir http://localhost:5173. Asegúrate de que el backend corra en http://localhost:5000.
Nota: En dev, el scheduler se inicia automáticamente. Prueba notificaciones con /api/auth/test-notif (requiere JWT).
🌐 Deploy en Render

Backend: Web Service con start.py como start command. Conecta a PostgreSQL service. Scheduler corre en background (APScheduler).
Base de Datos: PostgreSQL service, URL en env.
Frontend: Static Site, build con npm run build, y _redirects para SPA routing. Set VITE_API_URL a la URL del backend.
Migraciones: Ejecuta flask db upgrade manualmente post-deploy o via build script.
Scheduler: Jobs persisten en producción (notificaciones a las 10:00 CL, limpieza a 00:00 CL).

Monitorea logs en Render para emails y tareas programadas.
📜 Licencia
Este proyecto es de uso interno y educativo. Derechos reservados al desarrollador. Para uso comercial, contacta al maintainer.
