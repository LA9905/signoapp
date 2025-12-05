from flask import Blueprint, request, jsonify, render_template_string, current_app
from ..models.survey_model import SurveyResponse
from .. import db
from ..utils.survey_mailer import send_survey_email
from ..models.user_model import User
from datetime import datetime
from zoneinfo import ZoneInfo

# Blueprint para rutas API (/api/survey/...)
survey_api_bp = Blueprint("survey_api", __name__, url_prefix="/api/survey")

# Blueprint para la página pública de la encuesta (/encuesta/<token>)
survey_public_bp = Blueprint("survey_public", __name__)

@survey_public_bp.route("/encuesta/<token>", methods=["GET"])
def survey_form(token):
    response = SurveyResponse.query.filter_by(token=token).first()
    if not response:
        # Creamos uno vacío solo para que el token sea válido una vez
        response = SurveyResponse(token=token)
        db.session.add(response)
        db.session.commit()

    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Encuesta SignoApp</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; background: #f9fafb; }
            .container { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            h1 { color: #1e40af; text-align: center; }
            .rating { display: flex; gap: 10px; justify-content: center; margin: 10px 0; }
            .star { font-size: 32px; cursor: pointer; color: #ddd; }
            .star.active { color: #fbbf24; }
            textarea { width: 100%; height: 100px; padding: 10px; margin-top: 5px; border: 1px solid #ccc; border-radius: 6px; }
            button { background: #1e40af; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; margin-top: 20px; }
            .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; }
        </style>
    </head>
    <body>
    <div class="container">
        <h1>Encuesta de Satisfacción – SignoApp</h1>
        <p style="text-align:center;">Tu opinión nos ayuda a mejorar. ¡Gracias por dedicarnos 2 minutos!</p>
        <form id="surveyForm">
            <input type="hidden" name="token" value="{{token}}">

            <p><strong>1. ¿La app se ve bien y funciona correctamente en tu celular/tablet?</strong></p>
            <div class="rating" data-name="responsiva"></div>

            <p><strong>2. ¿Te gustan el estilo, colores y diseño actual de la app?</strong></p>
            <div class="rating" data-name="estilo_colores"></div>

            <p>¿Alguna idea de color o estilo que te gustaría ver en la próxima versión?</p>
            <textarea name="estilo_sugerencia" placeholder="Opcional..."></textarea>

            <p><strong>3. ¿SignoApp cubre bien las necesidades diarias de tu empresa?</strong></p>
            <div class="rating" data-name="cubre_necesidades"></div>

            <p>¿Qué funcionalidades o áreas crees que faltan o podrían mejorarse?</p>
            <textarea name="necesidades_faltantes" placeholder="Opcional..."></textarea>

            <p><strong>4. ¿La app y la API responden rápido y sin errores constantes?</strong></p>
            <div class="rating" data-name="api_estabilidad"></div>

            <p><strong>5. ¿Cómo calificarías la velocidad de carga y respuesta general?</strong></p>
            <div class="rating" data-name="velocidad_carga"></div>

            <p><strong>¿Quieres dejarnos algún comentario adicional?</strong></p>
            <textarea name="comentarios_generales" placeholder="Opcional..."></textarea>

            <p><strong>¿Quieres que sepamos quién eres? (Totalmente opcional)</strong></p>
            <input type="text" name="name" placeholder="Nombre (opcional)" style="width:100%; padding:10px; margin-bottom:10px;">
            <input type="email" name="email" placeholder="Correo (opcional)" style="width:100%; padding:10px;">

            <div style="text-align:center;">
                <button type="submit">Enviar Encuesta</button>
            </div>
        </form>

        <div id="thanks" style="display:none; text-align:center; padding:30px; font-size:18px;">
            <h2>¡Gracias por tu tiempo!</h2>
            <p>Tus respuestas han sido enviadas correctamente.</p>
        </div>

        <div class="footer">
            © 2025 SignoApp – Todas las respuestas llegan a acceso.signoapp@gmail.com
        </div>
    </div>

    <script>
        document.querySelectorAll('.rating').forEach(container => {
            const name = container.dataset.name;
            for(let i=1; i<=5; i++) {
                const star = document.createElement('span');
                star.className = 'star';
                star.textContent = '★';
                star.onclick = () => {
                    container.querySelectorAll('.star').forEach((s,j) => {
                        s.classList.toggle('active', j < i);
                    });
                    document.querySelector(`input[name="${name}"]`)?.remove();
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = name;
                    input.value = i;
                    container.parentNode.appendChild(input);
                };
                container.appendChild(star);
            }
        });

        document.getElementById('surveyForm').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            await fetch('/api/survey/submit', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            document.getElementById('surveyForm').style.display = 'none';
            document.getElementById('thanks').style.display = 'block';
        };
    </script>
    </body>
    </html>
    """
    return render_template_string(html.replace("{{token}}", token))

@survey_api_bp.route("/submit", methods=["POST"])
def submit_survey():
    data = request.json
    token = data.get("token")
    if not token:
        return jsonify({"msg": "Token faltante"}), 400

    response = SurveyResponse.query.filter_by(token=token).first()
    if not response:
        return jsonify({"msg": "Token inválido"}), 400

    response.name = data.get("name") or None
    response.email = data.get("email") or None
    response.responsiva = data.get("responsiva")
    response.estilo_colores = data.get("estilo_colores")
    response.estilo_sugerencia = data.get("estilo_sugerencia")
    response.cubre_necesidades = data.get("cubre_necesidades")
    response.necesidades_faltantes = data.get("necesidades_faltantes")
    response.api_estabilidad = data.get("api_estabilidad")
    response.velocidad_carga = data.get("velocidad_carga")
    response.comentarios_generales = data.get("comentarios_generales")

    db.session.commit()

    # Enviar notificación por correo al admin
    try:
        from app.utils.mailer import _send
        body = f"""
        Nueva respuesta de encuesta recibida!

        Nombre: {response.name or 'Anónimo'}
        Correo: {response.email or 'No proporcionado'}
        Fecha: {response.created_at.strftime("%d/%m/%Y %H:%M")}

        1. Responsiva (móvil/tablet):         {response.responsiva or '-'} / 5
        2. Estilo y colores:                  {response.estilo_colores or '-'} / 5
        3. Cubre necesidades diarias:        {response.cubre_necesidades or '-'} / 5
        4. Estabilidad API:                   {response.api_estabilidad or '-'} / 5
        5. Velocidad de carga:                {response.velocidad_carga or '-'} / 5

        ── Sugerencias de diseño y colores ──
        {response.estilo_sugerencia or 'Ninguna'}

        ── Funcionalidades que faltan o mejorar ──
        {response.necesidades_faltantes or 'Ninguna'}

        ── Comentarios adicionales ──
        {response.comentarios_generales or 'Ninguno'}

        Gracias por seguir mejorando SignoApp con nosotros
        """
        _send("Nueva respuesta de encuesta SignoApp", ["acceso.signoapp@gmail.com"], body)
    except Exception as e:
        current_app.logger.error(f"Error enviando notificación de encuesta: {e}")

    return jsonify({"msg": "Gracias!"})