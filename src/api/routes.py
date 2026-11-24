"""
=====================================================================
 FINFLUENT · RUTAS PRINCIPALES  (/api)

   POST /api/auth/login          usuario + contraseña -> token + perfil
   GET  /api/auth/me             perfil actualizado (y colegio)
   POST /api/auth/accept-terms   acepta términos y tratamiento de datos
   GET  /api/progress            progreso del estudiante (?period=P1 &light=1)
   POST /api/progress            guarda una fila (upsert + MERGE, nunca borra)
   GET  /api/health              para despertar / monitorear el servidor

 Las rutas de juegos están en games.py, las de admin en admin_routes.py
 y las de super admin en super_routes.py (todas bajo /api).
=====================================================================
"""
import json

from flask import Blueprint, jsonify, request
from flask_cors import CORS
from sqlalchemy.exc import IntegrityError

from api.auth import (auth_required, find_user_by_key, make_token,
                      touch_login, verify_password)
from api.models import db, Progress, period_keys, utcnow
from api.utils import APIException

api = Blueprint('api', __name__)
CORS(api)

# Versión vigente de los términos. Si cambias el texto de la ventana de términos
# (src/front/components/TermsModal.jsx), sube esta versión: todos los usuarios
# tendrán que aceptarlos otra vez la próxima vez que entren.
TERMS_VERSION = "2026-11"

# Las 6 semanas del curso demo original (se conservan por compatibilidad)
WEEK_TOTALS = {"1": 6, "2": 6, "3": 8, "4": 7, "5": 7, "6": 7}


def body():
    return request.get_json(silent=True, force=True) or {}


def profile_payload(user):
    data = user.serialize()
    data["School"] = user.school.serialize_public() if user.school else None
    data["Terminos_Vigentes"] = TERMS_VERSION
    return data


@api.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "success", "service": "finfluent"}), 200


# ---------------------------------------------------------------------
#  LOGIN
# ---------------------------------------------------------------------
@api.route('/auth/login', methods=['POST'])
def login():
    p = body()
    key = str(p.get("user_key") or "").strip()
    password = str(p.get("password") or "")
    bad = APIException("Wrong student key or password.", 401)
    if not key or not password:
        raise bad
    user = find_user_by_key(key)
    if not user or not verify_password(user.password_hash, password):
        raise bad
    if not user.is_active:
        raise APIException("This user is paused. Talk to your teacher.", 403)
    if user.school_id and user.school and not user.school.is_active:
        raise APIException("Your school's access is paused. Talk to your teacher.", 403)

    touch_login(user)
    db.session.commit()
    out = profile_payload(user)
    out["status"] = "success"
    out["token"] = make_token(user)
    return jsonify(out), 200


@api.route('/auth/me', methods=['GET'])
@auth_required()
def me(user):
    out = profile_payload(user)
    out["status"] = "success"
    return jsonify(out), 200


@api.route('/auth/accept-terms', methods=['POST'])
@auth_required()
def accept_terms(user):
    """El usuario aceptó términos y tratamiento de datos (versión vigente)."""
    p = body()
    if str(p.get("version") or "") != TERMS_VERSION:
        raise APIException("The terms changed. Reload the page and read them again.", 409)
    if not (p.get("data") and p.get("content")):
        raise APIException("Check both boxes to continue.", 400)
    user.terms_accepted_at = utcnow()
    user.terms_version = TERMS_VERSION
    db.session.commit()
    out = profile_payload(user)
    out["status"] = "success"
    return jsonify(out), 200


# ---------------------------------------------------------------------
#  PROGRESO
# ---------------------------------------------------------------------
def _pj(v):
    if not v:
        return {}
    if isinstance(v, dict):
        return v
    try:
        out = json.loads(v)
        return out if isinstance(out, dict) else {}
    except Exception:
        return {}


def _num(v):
    try:
        return float(v or 0)
    except Exception:
        return 0.0


def merge_progress(row, d):
    """Lo completado sigue completado, puntos = máximo, respuestas = unión
    (lo nuevo gana), el % nunca baja. Igual que mergeProgreso_ del Apps Script."""
    c1 = row.checklist or {}
    c2 = _pj(d.get("Checklist_JSON"))
    chk = dict(c1)
    for k, v in c2.items():
        chk[k] = bool(c1.get(k) or v)
    row.checklist = chk

    row.answers = {**(row.answers or {}), **_pj(d.get("Respuestas_JSON"))}

    row.pts_behavior = max(row.pts_behavior or 0, _num(d.get("Puntos_Comportamiento")))
    row.pts_quizzes = max(row.pts_quizzes or 0, _num(d.get("Puntos_Quizzes")))
    row.pts_learned = max(row.pts_learned or 0, _num(d.get("Puntos_Aprendi")))
    row.pts_total = row.pts_behavior + row.pts_quizzes + row.pts_learned

    total = WEEK_TOTALS.get(row.period_key)
    done = len([k for k, v in chk.items() if v])
    pct_chk = round(done / total * 100) if total else 0
    row.percent = min(100, max(row.percent or 0, _num(d.get("Porcentaje")), pct_chk))

    was_done = "completed" in (str(row.status or "").lower(), str(d.get("Estado") or "").lower())
    row.status = "completed" if (was_done or row.percent >= 100) else (d.get("Estado") or row.status or "in_progress")
    if d.get("Grado"):
        row.grade = str(d.get("Grado"))[:4]
    row.updated_at = utcnow()


def recalc_total(user):
    """Progreso global = promedio del % de los 4 periodos del grado del estudiante."""
    keys = period_keys(user.grade)
    if not keys:
        return
    rows = Progress.query.filter(Progress.user_id == user.id, Progress.period_key.in_(keys)).all()
    user.progress_total = round(sum(r.percent or 0 for r in rows) / len(keys))


@api.route('/progress', methods=['GET'])
@auth_required()
def get_progress(user):
    q = Progress.query.filter_by(user_id=user.id)
    period = request.args.get("period")
    if period:
        q = q.filter_by(period_key=str(period))
    light = request.args.get("light") == "1"
    return jsonify([r.serialize(light=light, student_key=user.student_key) for r in q.all()]), 200


@api.route('/progress', methods=['POST'])
@auth_required()
def save_progress(user):
    d = body().get("data") or body()
    period = str(d.get("Semana") or "").strip()[:12]
    if not period:
        raise APIException("Missing period (Semana).", 400)

    row = None
    for attempt in range(2):
        row = (Progress.query.filter_by(user_id=user.id, period_key=period)
               .with_for_update().first())
        if row:
            break
        row = Progress(user_id=user.id, period_key=period, grade=str(d.get("Grado") or user.grade or "")[:4],
                       checklist={}, answers={}, started_at=utcnow())
        db.session.add(row)
        try:
            db.session.flush()
            break
        except IntegrityError:      # dos guardados simultáneos del mismo periodo: reintenta leyendo
            db.session.rollback()
            row = None
    if row is None:
        raise APIException("Server busy, retrying.", 503)

    merge_progress(row, d)
    db.session.flush()
    recalc_total(user)
    db.session.commit()
    return jsonify({"status": "success", "message": "Progreso guardado",
                    "total": row.pts_total, "porcentaje": round(row.percent)}), 200


# Registra el resto de rutas sobre el mismo blueprint
from api import games, admin_routes, super_routes  # noqa: E402,F401
