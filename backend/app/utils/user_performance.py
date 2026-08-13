from datetime import date, datetime, timedelta
from calendar import monthrange
from collections import defaultdict
from app.models.dispatch_model import Dispatch
from app.models.dispatch_edit_model import DispatchEditLog
from app.models.user_model import User
from app.utils.timezone import to_utc_naive, CL_TZ

MOTIVO_LABELS = {
    "orden": "Orden de compra incorrecta",
    "productos": "Productos incorrectos o incompletos",
    "chofer": "Chofer incorrecto",
}


def _month_utc_bounds(year: int, month: int):
    first_local = datetime(year, month, 1, 0, 0, 0, tzinfo=CL_TZ)
    last_day = monthrange(year, month)[1]
    next_month_local = datetime(year, month, last_day, 0, 0, 0, tzinfo=CL_TZ) + timedelta(days=1)
    return to_utc_naive(first_local), to_utc_naive(next_month_local)


UMBRALES = [
    (1.15, "muy_alta"),
    (1.00, "alta"),
    (0.85, "regular"),
    (0.65, "baja"),
    (0.0,  "muy_baja"),
]


def clasificar(ratio):
    if ratio is None:
        return "sin_datos"
    for limite, etiqueta in UMBRALES:
        if ratio >= limite:
            return etiqueta
    return "muy_baja"


def evaluar_usuarios_logistica(year: int, month: int):
    """
    Evalúa a cada usuario que haya creado despachos en el mes. Combina:
      - Volumen: despachos creados respecto al promedio del equipo ese mes
        (aquí sí se compara directo contra el equipo, a diferencia de
        producción: un despacho es la misma unidad de trabajo para
        cualquiera que lo cree, no hay distorsión de tipo de producto).
      - Precisión: proporción de sus despachos que tuvo que ser corregida
        después. Más errores = menor puntaje, aunque el volumen sea alto.
    """
    start_utc, end_utc = _month_utc_bounds(year, month)
    dispatches = (
        Dispatch.query
        .filter(Dispatch.fecha >= start_utc, Dispatch.fecha < end_utc)
        .all()
    )

    por_usuario_total = defaultdict(int)
    por_usuario_ids = defaultdict(list)
    for d in dispatches:
        por_usuario_total[d.created_by] += 1
        por_usuario_ids[d.created_by].append(d.id)

    if not por_usuario_total:
        return []

    todos_los_ids = [did for ids in por_usuario_ids.values() for did in ids]
    logs = (
        DispatchEditLog.query.filter(DispatchEditLog.dispatch_id.in_(todos_los_ids)).all()
        if todos_los_ids else []
    )
    editados_por_dispatch = defaultdict(list)
    for log in logs:
        motivos = (log.motivos or "").split(";")
        editados_por_dispatch[log.dispatch_id].extend(m for m in motivos if m)

    promedio_equipo = sum(por_usuario_total.values()) / len(por_usuario_total)

    resultados = []
    for uid, total in por_usuario_total.items():
        ids = por_usuario_ids[uid]
        editados_ids = {did for did in ids if did in editados_por_dispatch}
        editados = len(editados_ids)
        tasa_error = (editados / total) if total > 0 else 0.0

        motivo_counts = defaultdict(int)
        for did in editados_ids:
            for m in set(editados_por_dispatch[did]):
                motivo_counts[m] += 1
        motivos_frecuentes = sorted(
            ({"motivo": m, "label": MOTIVO_LABELS.get(m, m), "count": c} for m, c in motivo_counts.items()),
            key=lambda x: -x["count"]
        )

        volumen_ratio = (total / promedio_equipo) if promedio_equipo > 0 else None
        precision = max(0.0, 1.0 - tasa_error)
        ratio = (volumen_ratio * precision) if volumen_ratio is not None else None

        try:
            user = User.query.get(int(uid))
        except (TypeError, ValueError):
            user = None

        resultados.append({
            "user_id": uid,
            "name": user.name if user else f"Usuario {uid}",
            "photo_url": user.avatar_url if user else None,
            "total_despachos": total,
            "editados": editados,
            "tasa_error": round(tasa_error, 3),
            "volumen_ratio": round(volumen_ratio, 3) if volumen_ratio is not None else None,
            "ratio": round(ratio, 3) if ratio is not None else None,
            "clasificacion": clasificar(ratio),
            "motivos_frecuentes": motivos_frecuentes,
        })

    hoy = date.today()
    mes_en_curso = (year == hoy.year and month == hoy.month)
    for r in resultados:
        r["mes_en_curso"] = mes_en_curso

    resultados.sort(key=lambda r: -r["total_despachos"])
    return resultados