"""
=====================================================================
 FINFLUENT · MODELOS (SQLAlchemy)

 Reemplaza las hojas del Google Sheets "FINANCIAL":

   Hoja de Sheets        ->  Tabla
   -------------------------------------------
   (nuevo)               ->  schools, grade_quotas
   User                  ->  users
   Progreso_Semanas      ->  progress
   Trading / Trade_Codes ->  trading, trade_codes
   Shop_Players / Orders ->  shop_players, shop_orders
   Fair_Companies / Inv. ->  fair_companies, fair_investments
   Global_Stores / Orders->  global_stores, global_orders
   Teams_11              ->  teams
   Question_Bank_11      ->  questions
   Battle_Rooms_11       ->  battle_rooms
   Leaderboard_11        ->  leaderboard

 Todo cuelga de un colegio (school_id): los mercados, ferias, tiendas y
 rankings de un colegio nunca se mezclan con los de otro.
=====================================================================
"""
from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import (Boolean, DateTime, Float, ForeignKey, Integer, JSON,
                        String, Text, UniqueConstraint, Index)
from sqlalchemy.orm import Mapped, mapped_column, relationship

db = SQLAlchemy()

GRADES = ["6", "7", "8", "9", "10", "11"]
ROLE_SUPER = "SUPERADMIN"
ROLE_ADMIN = "ADMIN"
ROLE_STUDENT = "STUDENT"


def utcnow():
    return datetime.now(timezone.utc)


def iso(dt):
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def period_keys(grade):
    """Llaves de los 4 periodos de un grado. Sexto conserva P1..P4 (como en el Excel)."""
    g = str(grade or "").strip()
    if g == "6":
        return ["P1", "P2", "P3", "P4"]
    if g in GRADES:
        return [f"{g}P{n}" for n in range(1, 5)]
    return []


# ---------------------------------------------------------------------
#  COLEGIOS
# ---------------------------------------------------------------------
class School(db.Model):
    __tablename__ = "schools"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    city: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    logo: Mapped[str] = mapped_column(Text, default="", nullable=False)          # data URL (escudo) o URL
    signer_name: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    signer_role: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    lock_periods: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # periodo N exige N-1
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    quotas = relationship("GradeQuota", back_populates="school", cascade="all, delete-orphan")
    users = relationship("User", back_populates="school", cascade="all, delete-orphan")

    def quota_map(self):
        out = {g: 0 for g in GRADES}
        for q in self.quotas:
            out[q.grade] = q.max_students
        return out

    def serialize_public(self):
        """Lo que ve cualquier usuario del colegio (para el diploma)."""
        return {
            "id": self.id, "name": self.name, "city": self.city, "logo": self.logo,
            "signer_name": self.signer_name, "signer_role": self.signer_role,
            "lock_periods": self.lock_periods,
        }

    def serialize(self):
        return {**self.serialize_public(), "is_active": self.is_active,
                "created_at": iso(self.created_at), "quotas": self.quota_map()}


class GradeQuota(db.Model):
    __tablename__ = "grade_quotas"
    __table_args__ = (UniqueConstraint("school_id", "grade", name="uq_quota_school_grade"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    grade: Mapped[str] = mapped_column(String(4), nullable=False)
    max_students: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    school = relationship("School", back_populates="quotas")


# ---------------------------------------------------------------------
#  USUARIOS  (hoja "User")
# ---------------------------------------------------------------------
class User(db.Model):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), nullable=True, index=True)
    student_key: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)  # usuario
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default=ROLE_STUDENT, nullable=False, index=True)
    grade: Mapped[str] = mapped_column(String(4), default="", nullable=False, index=True)       # 6..11
    group_name: Mapped[str] = mapped_column(String(20), default="", nullable=False)             # CURSO: 6A, 6B…
    progress_total: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    streak_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_login: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    # Términos y tratamiento de datos: cuándo aceptó y qué versión del texto
    terms_accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    terms_version: Mapped[str] = mapped_column(String(20), default="", server_default="", nullable=False)

    school = relationship("School", back_populates="users")
    progress = relationship("Progress", back_populates="user", cascade="all, delete-orphan")

    def serialize(self):
        """Mismas llaves que devolvía el login de Apps Script (el front las usa tal cual)."""
        return {
            "id": self.id,
            "Student_Key": self.student_key,
            "Nombre_Completo": self.full_name,
            "Email": self.email,
            "Rol": self.role,
            "Grado": self.grade,
            "CURSO": self.group_name,
            "Progreso_Total": self.progress_total,
            "Racha_Dias": self.streak_days,
            "Fecha_Ultimo_Login": iso(self.last_login),
            "Activo": self.is_active,
            "school_id": self.school_id,
            "Terminos_Aceptados": iso(self.terms_accepted_at),
            "Terminos_Version": self.terms_version or "",
        }


# ---------------------------------------------------------------------
#  PROGRESO  (hoja "Progreso_Semanas") · una fila por estudiante + periodo
# ---------------------------------------------------------------------
class Progress(db.Model):
    __tablename__ = "progress"
    __table_args__ = (UniqueConstraint("user_id", "period_key", name="uq_progress_user_period"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    period_key: Mapped[str] = mapped_column(String(12), nullable=False)     # P1..P4, 7P1.., 11P4 (antes "Semana")
    grade: Mapped[str] = mapped_column(String(4), default="", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="in_progress", nullable=False)
    percent: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    pts_behavior: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    pts_quizzes: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    pts_learned: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    pts_total: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    checklist: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    answers: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="progress")

    def serialize(self, light=False, student_key=None):
        import json
        row = {
            "ID_Registro": self.id,
            "Student_Key": student_key if student_key is not None else (self.user.student_key if self.user else ""),
            "Semana": self.period_key,
            "Grado": self.grade,
            "Estado": self.status,
            "Porcentaje": round(self.percent or 0),
            "Puntos_Comportamiento": self.pts_behavior or 0,
            "Puntos_Quizzes": self.pts_quizzes or 0,
            "Puntos_Aprendi": self.pts_learned or 0,
            "Puntos_Total": self.pts_total or 0,
            "Fecha_Inicio": iso(self.started_at),
            "Fecha_Actualizacion": iso(self.updated_at),
        }
        if not light:
            # Los periodos hacen JSON.parse() de estos campos: van como texto, igual que en Sheets
            row["Checklist_JSON"] = json.dumps(self.checklist or {}, ensure_ascii=False)
            row["Respuestas_JSON"] = json.dumps(self.answers or {}, ensure_ascii=False)
        return row


# ---------------------------------------------------------------------
#  CREAR MARKET · trueque con códigos  (Trading / Trade_Codes)
# ---------------------------------------------------------------------
class Trading(db.Model):
    __tablename__ = "trading"

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    scope: Mapped[str] = mapped_column(String(12), default="", nullable=False)   # "Grado" de la hoja
    object_id: Mapped[str] = mapped_column(String(40), default="", nullable=False)
    start_object: Mapped[str] = mapped_column(String(40), default="", nullable=False)
    trades: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    partners: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    history: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user = relationship("User")


class TradeCode(db.Model):
    __tablename__ = "trade_codes"
    __table_args__ = (Index("ix_trade_codes_school_code", "school_id", "code"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), nullable=True)
    code: Mapped[str] = mapped_column(String(8), nullable=False)
    from_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    object_id: Mapped[str] = mapped_column(String(40), default="", nullable=False)
    status: Mapped[str] = mapped_column(String(12), default="open", nullable=False)   # open | used | cancelled
    to_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


# ---------------------------------------------------------------------
#  CREAR SHOP · pagos digitales con PIN  (Shop_Players / Shop_Orders)
# ---------------------------------------------------------------------
class ShopPlayer(db.Model):
    __tablename__ = "shop_players"

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    scope: Mapped[str] = mapped_column(String(12), default="", nullable=False)
    role: Mapped[str] = mapped_column(String(10), default="", nullable=False)        # seller | buyer
    shop_name: Mapped[str] = mapped_column(String(60), default="", nullable=False)
    shop_code: Mapped[str] = mapped_column(String(8), default="", nullable=False, index=True)
    products: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    pin_hash: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    balance: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    spent: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    purchases: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sales_total: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    sales_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    history: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user = relationship("User")


class ShopOrder(db.Model):
    __tablename__ = "shop_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), nullable=True, index=True)
    shop_code: Mapped[str] = mapped_column(String(8), default="", nullable=False)
    seller_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    buyer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    items: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    total: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    method: Mapped[str] = mapped_column(String(12), default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


# ---------------------------------------------------------------------
#  FERIAS · stands + inversiones  (Fair_Companies / Fair_Investments)
#  scope = "6", "10-ST", "11-PRE", "11-GR"… (cada feria es un scope)
# ---------------------------------------------------------------------
class FairCompany(db.Model):
    __tablename__ = "fair_companies"
    __table_args__ = (UniqueConstraint("user_id", "scope", name="uq_fair_company_user_scope"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    scope: Mapped[str] = mapped_column(String(12), default="", nullable=False)
    company_name: Mapped[str] = mapped_column(String(80), default="", nullable=False)
    company: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user = relationship("User")


class FairInvestment(db.Model):
    __tablename__ = "fair_investments"

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), nullable=True, index=True)
    investor_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    company_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    category: Mapped[str] = mapped_column(String(20), default="", nullable=False)
    note: Mapped[str] = mapped_column(String(320), default="", nullable=False)
    scope: Mapped[str] = mapped_column(String(12), default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


# ---------------------------------------------------------------------
#  GLOBAL BUSINESS SHOWCASE  (Global_Stores / Global_Orders)
# ---------------------------------------------------------------------
class GlobalStore(db.Model):
    __tablename__ = "global_stores"

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    scope: Mapped[str] = mapped_column(String(12), default="", nullable=False)
    store_name: Mapped[str] = mapped_column(String(80), default="", nullable=False)
    store: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user = relationship("User")


class GlobalOrder(db.Model):
    __tablename__ = "global_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), nullable=True, index=True)
    buyer_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    store_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    items: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    total: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    method: Mapped[str] = mapped_column(String(20), default="", nullable=False)
    stars: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    review: Mapped[str] = mapped_column(String(220), default="", nullable=False)
    scope: Mapped[str] = mapped_column(String(12), default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    buyer = relationship("User", foreign_keys=[buyer_id])


# ---------------------------------------------------------------------
#  GRADO 11 · equipos, banco de preguntas, battleship, hall of fame
# ---------------------------------------------------------------------
class Team(db.Model):
    __tablename__ = "teams"
    __table_args__ = (Index("ix_teams_school_code", "school_id", "code"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), nullable=True)
    code: Mapped[str] = mapped_column(String(8), nullable=False)
    name: Mapped[str] = mapped_column(String(40), default="", nullable=False)
    scope: Mapped[str] = mapped_column(String(12), default="11", nullable=False)
    members: Mapped[list] = mapped_column(JSON, default=list, nullable=False)     # [{key, name}]
    data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Question(db.Model):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    scope: Mapped[str] = mapped_column(String(12), default="11", nullable=False)
    topic: Mapped[str] = mapped_column(String(40), default="", nullable=False)
    level: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    q: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    good: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    bad: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user = relationship("User")


class BattleRoom(db.Model):
    __tablename__ = "battle_rooms"
    __table_args__ = (Index("ix_battle_school_code", "school_id", "code"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), nullable=True)
    code: Mapped[str] = mapped_column(String(8), nullable=False)
    scope: Mapped[str] = mapped_column(String(12), default="11", nullable=False)
    a_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    a_name: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    b_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    b_name: Mapped[str] = mapped_column(String(160), default="", nullable=False)
    a_board: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    b_board: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    a_shots: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    b_shots: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    turn: Mapped[str] = mapped_column(String(1), default="A", nullable=False)
    winner: Mapped[str] = mapped_column(String(1), default="", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class LeaderboardEntry(db.Model):
    __tablename__ = "leaderboard"
    __table_args__ = (UniqueConstraint("user_id", "game", "scope", name="uq_leaderboard_user_game_scope"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    scope: Mapped[str] = mapped_column(String(12), default="11", nullable=False)
    game: Mapped[str] = mapped_column(String(12), nullable=False)
    score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    extra: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user = relationship("User")
