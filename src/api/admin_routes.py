"""
=====================================================================
 FINFLUENT · ADMIN DE COLEGIO   (/api/admin/…)

   GET    /admin/summary                 colegio, cupos y usados por grado
   GET    /admin/students?grade=6        lista del grado con % por periodo y quizzes
   GET    /admin/students/<id>           TODO lo que respondió un estudiante
   POST   /admin/students/bulk           crea muchos: nombres + usuarios + claves
   PUT    /admin/students/<id>           editar nombre, usuario, curso, grado, clave, activo
   DELETE /admin/students/<id>           borrar estudiante (y su progreso)
   DELETE /admin/students/<id>/progress  reiniciar un periodo (?period=P1) o todo

 El admin solo ve su colegio. El super admin puede entrar a cualquiera
 agregando ?school_id=<id>.
=====================================================================
"""
import re

from flask import jsonify, request
from sqlalchemy import func

from api.auth import admin_school, auth_required, hash_password
from api.models import (db, User, Progress, GRADES, ROLE_ADMIN, ROLE_STUDENT,
                        ROLE_SUPER, period_keys, iso)
from api.routes import api, body, recalc_total
from api.utils import APIException

KEY_RE = re.compile(r"^[A-Za-z0-9._@-]{2,60}$")


def grade_counts(school_id):
    rows = (db.session.query(User.grade, func.count(User.id))
            .filter(User.school_id == school_id, User.role == ROLE_STUDENT).group_by(User.grade).all())
    out = {g: 0 for g in GRADES}
    for g, n in rows:
        out[g] = n
    return out


def quizzes_of(answers):
    """Actividades con nota (correct/total) dentro del JSON de respuestas."""
    out = []
    for k, v in (answers or {}).items():
        if isinstance(v, dict) and isinstance(v.get("correct"), (int, float)) and v.get("total"):
            out.append({"key": k, "correct": v["correct"], "total": v["total"],
                        "missed": len(v.get("missed") or []) if isinstance(v.get("missed"), list) else None})
    return out


def student_or_404(school, user_id):
    s = db.session.get(User, int(user_id))
    if not s or s.school_id != school.id or s.role != ROLE_STUDENT:
        raise APIException("Estudiante no encontrado.", 404)
    return s


@api.route('/admin/summary', methods=['GET'])
@auth_required(ROLE_ADMIN, ROLE_SUPER)
def admin_summary(user):
    school = admin_school(user)
    return jsonify({"status": "success", "school": school.serialize(), "used": grade_counts(school.id)}), 200


@api.route('/admin/students', methods=['GET'])
@auth_required(ROLE_ADMIN, ROLE_SUPER)
def admin_students(user):
    school = admin_school(user)
    grade = str(request.args.get("grade") or "").strip()
    if grade not in GRADES:
        raise APIException("Elige un grado (6 a 11).", 400)
    keys = period_keys(grade)
    students = (User.query.filter_by(school_id=school.id, role=ROLE_STUDENT, grade=grade)
                .order_by(User.full_name).all())
    ids = [s.id for s in students]
    by_user = {}
    if ids:
        for r in Progress.query.filter(Progress.user_id.in_(ids), Progress.period_key.in_(keys)).all():
            row = r.serialize(light=True, student_key="")
            row["quizzes"] = quizzes_of(r.answers)
            row["done_acts"] = len([1 for v in (r.checklist or {}).values() if v])
            by_user.setdefault(r.user_id, {})[r.period_key] = row
    out = []
    for s in students:
        periods = by_user.get(s.id, {})
        out.append({
            "id": s.id, "key": s.student_key, "name": s.full_name, "email": s.email, "group": s.group_name,
            "grade": s.grade, "active": s.is_active, "lastLogin": iso(s.last_login), "streak": s.streak_days,
            "terms": iso(s.terms_accepted_at) if s.terms_version else None,
            "overall": round(sum((periods.get(k) or {}).get("Porcentaje", 0) for k in keys) / len(keys)),
            "periods": periods,
        })
    return jsonify({"status": "success", "grade": grade, "periods": keys, "students": out,
                    "school": school.serialize(), "used": grade_counts(school.id)}), 200


@api.route('/admin/students/<int:user_id>', methods=['GET'])
@auth_required(ROLE_ADMIN, ROLE_SUPER)
def admin_student_detail(user, user_id):
    school = admin_school(user)
    s = student_or_404(school, user_id)
    rows = Progress.query.filter_by(user_id=s.id).all()
    return jsonify({"status": "success", "student": s.serialize(),
                    "progreso": [r.serialize(student_key=s.student_key) for r in rows]}), 200


@api.route('/admin/students/bulk', methods=['POST'])
@auth_required(ROLE_ADMIN, ROLE_SUPER)
def admin_bulk_create(user):
    """Recibe 3 listas (una línea por estudiante) o rows=[{name,key,password}]."""
    school = admin_school(user)
    p = body()
    grade = str(p.get("grade") or "").strip()
    group = str(p.get("group") or "").strip()[:20]
    if grade not in GRADES:
        raise APIException("Elige un grado (6 a 11).", 400)

    rows = p.get("rows")
    if not rows:
        names, keys, pws = p.get("names") or [], p.get("keys") or [], p.get("passwords") or []
        if not (len(names) == len(keys) == len(pws)):
            raise APIException(f"Las tres listas deben tener la misma cantidad de filas "
                               f"(nombres: {len(names)}, usuarios: {len(keys)}, claves: {len(pws)}).", 400)
        rows = [{"name": n, "key": k, "password": w} for n, k, w in zip(names, keys, pws)]
    if not rows:
        raise APIException("No hay estudiantes para crear.", 400)
    if len(rows) > 300:
        raise APIException("Máximo 300 estudiantes por carga.", 400)

    errors, seen, clean = [], set(), []
    for i, r in enumerate(rows, start=1):
        name = " ".join(str((r or {}).get("name") or "").split())[:160]
        key = str((r or {}).get("key") or "").strip()
        pw = str((r or {}).get("password") or "").strip()
        if not name:
            errors.append(f"Fila {i}: falta el nombre.")
        if not KEY_RE.match(key):
            errors.append(f"Fila {i}: el usuario \"{key}\" no es válido (sin espacios; letras, números, punto, guion).")
        elif key.lower() in seen:
            errors.append(f"Fila {i}: el usuario \"{key}\" está repetido en la lista.")
        if len(pw) < 3:
            errors.append(f"Fila {i}: la clave debe tener al menos 3 caracteres.")
        seen.add(key.lower())
        clean.append((name, key, pw))

    if seen:
        taken = [k for (k,) in db.session.query(User.student_key).filter(func.lower(User.student_key).in_(seen)).all()]
        for k in taken:
            errors.append(f"El usuario \"{k}\" ya existe en la plataforma. Usa otro.")

    quota = school.quota_map().get(grade, 0)
    used = grade_counts(school.id).get(grade, 0)
    if used + len(clean) > quota:
        errors.append(f"Cupos insuficientes en grado {grade}: tienes {quota} cupos, {used} usados, "
                      f"e intentas crear {len(clean)}. Disponibles: {max(0, quota - used)}.")

    if errors:
        return jsonify({"status": "error", "message": "No se creó ningún usuario. Corrige y vuelve a intentar.",
                        "errors": errors[:60]}), 400

    for name, key, pw in clean:
        db.session.add(User(school_id=school.id, student_key=key, full_name=name, password_hash=hash_password(pw),
                            role=ROLE_STUDENT, grade=grade, group_name=group))
    db.session.commit()
    return jsonify({"status": "success", "created": len(clean), "used": grade_counts(school.id)}), 201


@api.route('/admin/students/<int:user_id>', methods=['PUT'])
@auth_required(ROLE_ADMIN, ROLE_SUPER)
def admin_update_student(user, user_id):
    school = admin_school(user)
    s = student_or_404(school, user_id)
    p = body()
    if "name" in p:
        name = " ".join(str(p["name"] or "").split())[:160]
        if not name:
            raise APIException("El nombre no puede quedar vacío.", 400)
        s.full_name = name
    if "key" in p and str(p["key"]).strip().lower() != s.student_key.lower():
        key = str(p["key"]).strip()
        if not KEY_RE.match(key):
            raise APIException("Usuario no válido (sin espacios).", 400)
        if User.query.filter(func.lower(User.student_key) == key.lower(), User.id != s.id).first():
            raise APIException("Ese usuario ya existe.", 400)
        s.student_key = key
    if "email" in p:
        s.email = str(p["email"] or "").strip()[:160]
    if "group" in p:
        s.group_name = str(p["group"] or "").strip()[:20]
    if "grade" in p and str(p["grade"]) != s.grade:
        grade = str(p["grade"])
        if grade not in GRADES:
            raise APIException("Grado no válido.", 400)
        if grade_counts(school.id).get(grade, 0) + 1 > school.quota_map().get(grade, 0):
            raise APIException(f"No quedan cupos en grado {grade}.", 400)
        s.grade = grade
        recalc_total(s)
    if p.get("password"):
        if len(str(p["password"]).strip()) < 3:
            raise APIException("La clave debe tener al menos 3 caracteres.", 400)
        s.password_hash = hash_password(str(p["password"]).strip())
    if "active" in p:
        s.is_active = bool(p["active"])
    db.session.commit()
    return jsonify({"status": "success", "student": s.serialize()}), 200


@api.route('/admin/students/<int:user_id>', methods=['DELETE'])
@auth_required(ROLE_ADMIN, ROLE_SUPER)
def admin_delete_student(user, user_id):
    school = admin_school(user)
    s = student_or_404(school, user_id)
    db.session.delete(s)
    db.session.commit()
    return jsonify({"status": "success", "used": grade_counts(school.id)}), 200


@api.route('/admin/students/<int:user_id>/progress', methods=['DELETE'])
@auth_required(ROLE_ADMIN, ROLE_SUPER)
def admin_reset_progress(user, user_id):
    school = admin_school(user)
    s = student_or_404(school, user_id)
    q = Progress.query.filter_by(user_id=s.id)
    period = request.args.get("period")
    if period:
        q = q.filter_by(period_key=period)
    q.delete(synchronize_session=False)
    db.session.flush()
    recalc_total(s)
    db.session.commit()
    return jsonify({"status": "success"}), 200
