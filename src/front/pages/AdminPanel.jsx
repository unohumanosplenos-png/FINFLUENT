import React, { useEffect, useMemo, useState } from "react";
import {
  Users, UserX, TrendingUp, Trophy, RefreshCw, Search, Download, ArrowLeft, ChevronRight,
  Check, X, AlertTriangle, FileText, UserPlus, KeyRound, Trash2, Pause, Play, Pencil, Wand2, Undo2,
} from "lucide-react";
import { apiOk } from "../api";
import { COURSES, GRADES, courseOf } from "../courses";
import { CATALOG } from "../activityCatalog";
import "../Styles/admin.css";
import "../Styles/platform.css";

/* =====================================================================
   ADMIN DEL COLEGIO
   · Elige un grado (6 a 11) -> lista de estudiantes con su avance por periodo
   · Entra a un estudiante   -> todo lo que hizo, sus notas y en qué se equivocó
   · Crear usuarios          -> pega 3 listas: nombres, usuarios y claves
   El super admin usa este mismo panel pasando schoolId.
   ===================================================================== */

/* ---------- CURSO DEMO DE 6 SEMANAS (desactivado; se conserva como referencia) ----------
const WEEKS = [1, 2, 3, 4, 5, 6];
const WEEK_TITLES = { 1: "Money Mindset", 2: "Smart Saving", 3: "Money Over Time", 4: "Credit & Debt", 5: "Investing 101", 6: "Go Live" };
const ACTIVITY_LABELS = {
  warmup: "Self-check", diagnostic: "Self-check (diagnóstico)", reading: "Lectura", video: "Video quiz",
  sort: "Saving or Spending", check: "Reading check", start: "Starting point (presupuesto)",
  banks: "Bank scout", permission: "Hablar con la familia", instruments: "Simulador CDT vs bolsillo",
  plan: "Plan de ahorro", timevalue: "Today vs Tomorrow", interest: "Simple vs Compuesto",
  pvfv: "Valor Presente / Futuro", rates: "Rate match", growth: "Proyección / Crecimiento",
  final: "Examen final", cost: "Costo real del crédito", amort: "Tabla de amortización",
  extra: "Abono a capital", research: "Investigación de tasas", npvtir: "VPN y TIR",
  bcpri: "B/C y Payback", risk: "Riesgo vs retorno", explore: "Explorar Tyba",
  stablecoin: "Dólares digitales", match: "Asset match", portfolio: "Portafolio", feedback: "Feedback del curso",
};
El panel anterior leía User + Progreso_Semanas con action "admin_overview" y armaba
columnas S1…S6. Ahora las columnas son los 4 periodos del grado elegido.
------------------------------------------------------------------------------------- */

const STATUS = {
  never: { label: "Nunca entró" },
  idle: { label: "Entró sin avanzar" },
  active: { label: "En progreso" },
  finished: { label: "Terminó el grado" },
};

const FIELD_LABELS = {
  reflection: "Reflexión", why: "Por qué", summary: "Resumen", analysis: "Análisis", notes: "Notas",
  opinion: "Opinión", goal: "Meta", income: "Ingreso", expenses: "Gastos", needs: "Necesidades", wants: "Deseos",
  correct: "Correctas", total: "Total", scores: "Puntajes", name: "Nombre", amount: "Monto", choice: "Elección",
  done: "Completado", xp: "Monedas", pct: "Porcentaje", passed: "Aprobó", read: "Leído", text: "Texto",
  average: "Promedio", profile: "Perfil", words: "Palabras", attempts: "Intentos", time: "Tiempo",
};
const HIDDEN_FIELDS = ["at", "order", "form", "missed"];

/* ---------------- helpers ---------------- */
const num = (v) => parseFloat(v || 0) || 0;
const parseJSON = (s) => {
  if (!s) return {};
  if (typeof s === "object") return s;
  try { return JSON.parse(s); } catch { return {}; }
};
const isDone = (row) => !!row && String(row.Estado || "").toLowerCase() === "completed";
const rowXP = (row) => (row ? num(row.Puntos_Comportamiento) + num(row.Puntos_Quizzes) + num(row.Puntos_Aprendi) : 0);
const humanize = (k) => FIELD_LABELS[k] || String(k).replace(/_/g, " ").replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
const countWords = (s) => (String(s).trim() ? String(s).trim().split(/\s+/).length : 0);
const withSchool = (path, schoolId) => (schoolId ? `${path}${path.includes("?") ? "&" : "?"}school_id=${schoolId}` : path);

// Nombre de una actividad y la clase a la que pertenece (del catálogo generado)
const ACT_INDEX = {};
Object.entries(CATALOG).forEach(([pk, p]) => p.weeks.forEach((w) => w.acts.forEach((a) => {
  ACT_INDEX[`${pk}|${a.key}`] = { title: a.title, week: w.label, weekTitle: w.title };
})));
const actTitle = (pk, key) => ACT_INDEX[`${pk}|${key}`]?.title || key;
const totalActs = (pk) => (CATALOG[pk]?.weeks || []).reduce((a, w) => a + w.acts.length, 0);

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return d.toLocaleString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function timeAgo(v) {
  if (!v) return "Nunca";
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}

function decorate(list, keys) {
  return (list || []).map((s) => {
    const weeks = s.periods || {};
    const done = keys.filter((k) => isDone(weeks[k])).length;
    const xp = Math.round(keys.reduce((a, k) => a + rowXP(weeks[k]), 0));
    const started = Object.keys(weeks).length > 0;
    const status = keys.length && done === keys.length ? "finished" : started ? "active" : s.lastLogin ? "idle" : "never";
    const quizzes = keys.flatMap((k) => (weeks[k]?.quizzes || []).map((q) => ({ ...q, period: k, pct: Math.round((q.correct / q.total) * 100) })));
    return { ...s, weeks, done, xp, status, quizzes, course: s.group || "" };
  });
}

/* ---------------- piezas pequeñas ---------------- */
function PctPill({ row }) {
  const p = Math.round(num(row?.Porcentaje));
  const cls = !row || p === 0 ? "zero" : isDone(row) ? "done" : "partial";
  return <span className={`adm-pill ${cls}`}>{cls === "done" && <Check size={12} strokeWidth={3} />}{p}%</span>;
}

function ValueView({ value }) {
  if (value === null || value === undefined || value === "") return <span className="adm-muted">—</span>;
  if (typeof value === "boolean") return <span>{value ? "Sí" : "No"}</span>;
  if (typeof value === "number") return <span className="adm-num">{value.toLocaleString("es-CO")}</span>;
  if (typeof value === "string") {
    if (value.startsWith("data:image")) return <img className="adm-img" src={value} alt="Trabajo del estudiante" />;
    if (value.length > 60) return <p className="adm-text">{value}<small>{countWords(value)} palabras</small></p>;
    return <span>{value}</span>;
  }
  if (Array.isArray(value)) {
    if (!value.length) return <span className="adm-muted">—</span>;
    return <div className="adm-list">{value.map((v, i) => <div key={i} className="adm-list-item"><ValueView value={v} /></div>)}</div>;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([k]) => !HIDDEN_FIELDS.includes(k));
    if (!entries.length) return <span className="adm-muted">Completado</span>;
    return (
      <dl className="adm-dl">
        {entries.map(([k, v]) => (
          <React.Fragment key={k}><dt>{humanize(k)}</dt><dd><ValueView value={v} /></dd></React.Fragment>
        ))}
      </dl>
    );
  }
  return <span>{String(value)}</span>;
}

/* =====================================================================
   CREAR USUARIOS EN LOTE · 3 listas pegadas desde Excel
   ===================================================================== */
const lines = (t) => String(t || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

function BulkCreate({ grade, quota, used, schoolId, onClose, onCreated }) {
  const [names, setNames] = useState("");
  const [keys, setKeys] = useState("");
  const [passwords, setPasswords] = useState("");
  const [group, setGroup] = useState("");
  const [samePw, setSamePw] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState([]);

  const n = lines(names), k = lines(keys), p = lines(passwords);
  const free = Math.max(0, quota - used);
  const ready = n.length > 0 && n.length === k.length && n.length === p.length;

  // nombre.apellido a partir de la lista de nombres (sin tildes, sin repetir)
  const suggestKeys = () => {
    const seen = {};
    setKeys(n.map((full) => {
      const parts = full.split(/\s+/).map(slug).filter(Boolean);
      let base = parts.length > 1 ? `${parts[0]}.${parts.length > 2 ? parts[parts.length - 2] : parts[1]}` : parts[0] || "user";
      seen[base] = (seen[base] || 0) + 1;
      return seen[base] > 1 ? `${base}${seen[base]}` : base;
    }).join("\n"));
  };
  const fillPasswords = () => { if (samePw.trim()) setPasswords(n.map(() => samePw.trim()).join("\n")); };

  const submit = async () => {
    setBusy(true); setErrors([]);
    try {
      const res = await apiOk(withSchool("/admin/students/bulk", schoolId), { method: "POST", body: { grade, group, names: n, keys: k, passwords: p } });
      onCreated(res.created);
    } catch (e) {
      setErrors(e.details?.length ? e.details : [e.message]);
    } finally { setBusy(false); }
  };

  return (
    <section className="adm-card adm-bulk">
      <div className="adm-resp-head">
        <h3><UserPlus size={18} strokeWidth={2.3} /> Crear usuarios · Grado {grade}</h3>
        <button className="adm-btn" onClick={onClose}><X size={16} strokeWidth={2.4} /> Cerrar</button>
      </div>
      <p className="adm-help">
        Copia cada columna de tu Excel y pégala en su casilla: <b>una línea por estudiante</b>, en el mismo orden.
        El resto (rol, grado, progreso, racha) se llena solo. Cupos de grado {grade}: <b>{used}</b> usados de <b>{quota}</b> · quedan <b>{free}</b>.
      </p>

      <div className="adm-bulk-grid">
        <label><span>1 · Nombres completos <em>{n.length}</em></span>
          <textarea value={names} onChange={(e) => setNames(e.target.value)} placeholder={"Ana María Paz\nLuis Gil Rojas\n…"} spellCheck={false} />
        </label>
        <label><span>2 · Usuarios (Student_Key) <em className={k.length !== n.length ? "bad" : ""}>{k.length}</em></span>
          <textarea value={keys} onChange={(e) => setKeys(e.target.value)} placeholder={"ana.paz\nluis.gil\n…"} spellCheck={false} />
          <button type="button" className="adm-link" onClick={suggestKeys} disabled={!n.length}><Wand2 size={14} strokeWidth={2.3} /> Sugerir usuarios desde los nombres</button>
        </label>
        <label><span>3 · Claves <em className={p.length !== n.length ? "bad" : ""}>{p.length}</em></span>
          <textarea value={passwords} onChange={(e) => setPasswords(e.target.value)} placeholder={"1234\n1234\n…"} spellCheck={false} />
          <span className="adm-inline">
            <input value={samePw} onChange={(e) => setSamePw(e.target.value)} placeholder="Misma clave para todos" />
            <button type="button" className="adm-link" onClick={fillPasswords} disabled={!n.length || !samePw.trim()}>Aplicar</button>
          </span>
        </label>
      </div>

      <div className="adm-bulk-foot">
        <label className="adm-field"><span>Curso (opcional)</span>
          <input value={group} onChange={(e) => setGroup(e.target.value)} placeholder={`${grade}A`} maxLength={20} />
        </label>
        <div className="adm-bulk-status">
          {n.length > 0 && !ready && <span className="bad">Las tres listas deben tener la misma cantidad de líneas.</span>}
          {ready && n.length > free && <span className="bad">Son {n.length} estudiantes y solo quedan {free} cupos.</span>}
          {ready && n.length <= free && <span className="ok">Listo: {n.length} estudiantes para grado {grade}.</span>}
        </div>
        <button className="adm-btn primary" onClick={submit} disabled={busy || !ready}>
          <UserPlus size={16} strokeWidth={2.4} /> {busy ? "Creando…" : `Crear ${n.length || ""} usuarios`}
        </button>
      </div>

      {ready && (
        <div className="adm-preview">
          {n.slice(0, 5).map((name, i) => <span key={i}><b>{name}</b> → {k[i]} · {p[i]}</span>)}
          {n.length > 5 && <span className="adm-muted">…y {n.length - 5} más</span>}
        </div>
      )}
      {errors.length > 0 && (
        <div className="adm-error col">
          <b><AlertTriangle size={16} strokeWidth={2.4} /> No se creó ningún usuario. Corrige esto y vuelve a intentar:</b>
          <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}
    </section>
  );
}

/* =====================================================================
   DETALLE DE UN ESTUDIANTE
   ===================================================================== */
function StudentDetail({ s, keys, course, schoolId, onBack, onChanged }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState(() => keys.find((k) => s.weeks[k]) || keys[0]);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError("");
    try {
      const res = await apiOk(withSchool(`/admin/students/${s.id}`, schoolId));
      const by = {};
      (res.progreso || []).forEach((r) => { by[r.Semana] = r; });
      setRows(by);
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, [s.id]); // eslint-disable-line

  const act = async (fn, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true); setError("");
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const save = () => act(async () => {
    const body = { name: edit.name, key: edit.key, group: edit.group, grade: edit.grade };
    if (edit.password.trim()) body.password = edit.password.trim();
    await apiOk(withSchool(`/admin/students/${s.id}`, schoolId), { method: "PUT", body });
    setEdit(null); onChanged(edit.grade !== s.grade);
  });
  const toggleActive = () => act(async () => {
    await apiOk(withSchool(`/admin/students/${s.id}`, schoolId), { method: "PUT", body: { active: !s.active } });
    onChanged();
  });
  const remove = () => act(async () => {
    await apiOk(withSchool(`/admin/students/${s.id}`, schoolId), { method: "DELETE" });
    onChanged(true);
  }, `¿Borrar a ${s.name}? Se elimina el usuario y TODO su progreso. No se puede deshacer.`);
  const resetPeriod = () => act(async () => {
    await apiOk(withSchool(`/admin/students/${s.id}/progress?period=${encodeURIComponent(period)}`, schoolId), { method: "DELETE" });
    await load(); onChanged();
  }, `¿Reiniciar el periodo de ${s.name}? Se borran sus respuestas de este periodo.`);

  const pDef = course.periods.find((p) => p.key === period);
  const row = rows?.[period];
  const resp = parseJSON(row?.Respuestas_JSON);
  const checklist = parseJSON(row?.Checklist_JSON);
  const weeks = CATALOG[period]?.weeks || [];
  const known = new Set(weeks.flatMap((w) => w.acts.map((a) => a.key)));
  const extra = Object.keys(resp).filter((k) => !known.has(k));
  const doneCount = Object.values(checklist).filter(Boolean).length;

  const renderAnswer = (k, title) => {
    const v = resp[k];
    const hasScore = v && typeof v.correct === "number" && v.total;
    const pct = hasScore ? Math.round((v.correct / v.total) * 100) : null;
    const missed = Array.isArray(v?.missed) ? v.missed : [];
    return (
      <section key={k} className="adm-card adm-resp">
        <div className="adm-resp-head">
          <h3>{checklist[k] ? <Check size={16} strokeWidth={3} className="ok-ico" /> : null} {title}</h3>
          <div className="adm-resp-meta">
            {hasScore && <span className={`adm-score ${pct >= 70 ? "ok" : "low"}`}>{v.correct}/{v.total} · {pct}%</span>}
            {v?.passed === false && <span className="adm-score low">No aprobó</span>}
            {v?.at && <small>{fmtDate(v.at)}</small>}
          </div>
        </div>
        {missed.length > 0 && (
          <div className="adm-missed">
            <b>Se equivocó en {missed.length} {missed.length === 1 ? "pregunta" : "preguntas"}:</b>
            {missed.map((m, i) => (
              <div key={i} className="adm-missed-item">
                <p>{m.q}</p>
                <span className="wrong"><X size={13} strokeWidth={3} /> Marcó: {m.chose ?? "sin respuesta"}</span>
                <span className="right"><Check size={13} strokeWidth={3} /> Correcta: {m.right}</span>
              </div>
            ))}
          </div>
        )}
        <ValueView value={v} />
      </section>
    );
  };

  return (
    <div className="adm">
      <button className="adm-back" onClick={onBack}><ArrowLeft size={18} strokeWidth={2.4} /> Volver a grado {s.grade}</button>

      <header className="adm-student">
        <div className="adm-avatar">{s.name.charAt(0)}</div>
        <div className="adm-student-info">
          <h1>{s.name}</h1>
          <p>Usuario: <b>{s.key}</b> · Grado {s.grade}{s.course ? ` · Curso ${s.course}` : ""} · Último ingreso: {fmtDate(s.lastLogin)}</p>
          <span className={`adm-status ${s.status}`}>{STATUS[s.status].label}</span>
          {!s.active && <span className="adm-status never">Pausado</span>}
          <span className={`adm-status ${s.terms ? "terms-ok" : "terms-no"}`}>
            {s.terms ? `Aceptó términos · ${fmtDate(s.terms)}` : "No ha aceptado términos"}
          </span>
        </div>
        <div className="adm-student-kpis">
          <span><b>{s.overall}%</b>Año</span>
          <span><b>{s.done}/{keys.length}</b>Periodos</span>
          <span><b>{s.xp}</b>XP</span>
        </div>
      </header>

      <div className="adm-actions">
        <button className="adm-btn" disabled={busy} onClick={() => setEdit(edit ? null : { name: s.name, key: s.key, group: s.course, grade: s.grade, password: "" })}>
          <Pencil size={15} strokeWidth={2.4} /> Editar / cambiar clave
        </button>
        <button className="adm-btn" disabled={busy} onClick={toggleActive}>
          {s.active ? <><Pause size={15} strokeWidth={2.4} /> Pausar acceso</> : <><Play size={15} strokeWidth={2.4} /> Reactivar</>}
        </button>
        <button className="adm-btn danger" disabled={busy} onClick={remove}><Trash2 size={15} strokeWidth={2.4} /> Borrar estudiante</button>
      </div>

      {edit && (
        <section className="adm-card adm-form">
          <label className="adm-field"><span>Nombre completo</span><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
          <label className="adm-field"><span>Usuario</span><input value={edit.key} onChange={(e) => setEdit({ ...edit, key: e.target.value })} /></label>
          <label className="adm-field"><span>Curso</span><input value={edit.group} onChange={(e) => setEdit({ ...edit, group: e.target.value })} maxLength={20} /></label>
          <label className="adm-field"><span>Grado</span>
            <select value={edit.grade} onChange={(e) => setEdit({ ...edit, grade: e.target.value })}>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</select>
          </label>
          <label className="adm-field"><span><KeyRound size={13} strokeWidth={2.4} /> Clave nueva (vacío = no cambia)</span>
            <input value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} placeholder="••••" />
          </label>
          <button className="adm-btn primary" disabled={busy} onClick={save}>Guardar cambios</button>
        </section>
      )}

      {error && <div className="adm-error"><AlertTriangle size={18} strokeWidth={2.4} /> {error}</div>}

      {s.quizzes.length > 0 && (
        <section className="adm-card">
          <h3 className="adm-card-title">Notas de quizzes y juegos</h3>
          <div className="adm-quiz-grid">
            {s.quizzes.map((q) => (
              <div key={q.period + q.key} className={`adm-quiz ${q.pct >= 70 ? "ok" : "low"}`}>
                <small>P{course.periods.find((p) => p.key === q.period)?.n} · {actTitle(q.period, q.key)}</small>
                <b>{q.correct}/{q.total}</b>
                <span>{q.pct}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="adm-tabs">
        {course.periods.map((p) => (
          <button key={p.key} className={`adm-tab ${period === p.key ? "on" : ""}`} onClick={() => setPeriod(p.key)}>
            Periodo {p.n} <PctPill row={rows?.[p.key] || s.weeks[p.key]} />
          </button>
        ))}
      </div>

      {rows === null ? (
        <div className="adm-empty">Cargando respuestas…</div>
      ) : !row ? (
        <div className="adm-empty"><FileText size={28} strokeWidth={2} /> No ha empezado el Periodo {pDef?.n} ({pDef?.title}).</div>
      ) : (
        <>
          <section className="adm-card">
            <div className="adm-week-summary">
              <div><small>Estado</small><b>{isDone(row) ? "Completado" : "En curso"}</b></div>
              <div><small>Avance</small><b>{Math.round(num(row.Porcentaje))}%</b></div>
              <div><small>Actividades</small><b>{doneCount}/{totalActs(period) || "—"}</b></div>
              <div><small>Comportamiento</small><b>{num(row.Puntos_Comportamiento)}</b></div>
              <div><small>Quizzes</small><b>{num(row.Puntos_Quizzes)}</b></div>
              <div><small>What I learned</small><b>{num(row.Puntos_Aprendi)}</b></div>
              <div><small>Total</small><b>{num(row.Puntos_Total) || rowXP(row)}</b></div>
              <div><small>Última actualización</small><b className="sm">{fmtDate(row.Fecha_Actualizacion)}</b></div>
            </div>
            <button className="adm-link danger" disabled={busy} onClick={resetPeriod}><Undo2 size={14} strokeWidth={2.3} /> Reiniciar este periodo</button>
          </section>

          {weeks.map((w) => (
            <div key={w.n} className="adm-class">
              <div className="adm-class-head">
                <h3>Clase {w.label} · {w.title}</h3>
                <span>{w.acts.filter((a) => checklist[a.key]).length}/{w.acts.length} actividades</span>
              </div>
              <div className="adm-chips">
                {w.acts.map((a) => (
                  <span key={a.key} className={`adm-chip ${checklist[a.key] ? "ok" : "no"}`}>
                    {checklist[a.key] ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />} {a.title}
                  </span>
                ))}
              </div>
              {w.acts.filter((a) => resp[a.key] !== undefined).map((a) => renderAnswer(a.key, a.title))}
            </div>
          ))}
          {extra.map((k) => renderAnswer(k, k))}
          {Object.keys(resp).length === 0 && <div className="adm-empty">Aún no hay respuestas guardadas en este periodo.</div>}
        </>
      )}
    </div>
  );
}

/* =====================================================================
   PANEL PRINCIPAL
   ===================================================================== */
export const AdminPanel = ({ schoolId = null, schoolName = "", onExit = null }) => {
  const [grade, setGrade] = useState("6");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [group, setGroup] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = async (g = grade) => {
    setLoading(true); setError("");
    try {
      const res = await apiOk(withSchool(`/admin/students?grade=${g}`, schoolId));
      setData(res); setUpdatedAt(new Date());
    } catch (e) { setError(e.message || "No se pudo conectar con el servidor."); }
    finally { setLoading(false); }
  };
  useEffect(() => { setData(null); setSelectedId(null); setFilter("all"); setGroup("all"); load(grade); }, [grade, schoolId]); // eslint-disable-line

  const course = courseOf(grade);
  const keys = data?.periods || course.periods.map((p) => p.key);
  const students = useMemo(() => decorate(data?.students, keys), [data]); // eslint-disable-line
  const quotas = data?.school?.quotas || {};
  const used = data?.used || {};

  const groups = useMemo(() => [...new Set(students.map((s) => s.course).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es", { numeric: true })), [students]);
  const scoped = useMemo(() => (group === "all" ? students : group === "none" ? students.filter((s) => !s.course) : students.filter((s) => s.course === group)), [students, group]);

  const stats = useMemo(() => {
    const total = scoped.length || 1;
    return {
      total: scoped.length,
      never: scoped.filter((s) => s.status === "never").length,
      avg: Math.round(scoped.reduce((a, s) => a + s.overall, 0) / total),
      finished: scoped.filter((s) => s.status === "finished").length,
      perPeriod: keys.map((k) => ({
        k,
        done: scoped.filter((s) => isDone(s.weeks[k])).length,
        started: scoped.filter((s) => num(s.weeks[k]?.Porcentaje) > 0).length,
      })),
    };
  }, [scoped]); // eslint-disable-line

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = scoped.filter((s) => !q || s.name.toLowerCase().includes(q) || s.key.toLowerCase().includes(q));
    if (STATUS[filter]) arr = arr.filter((s) => s.status === filter);
    else if (filter.startsWith("done-")) { const k = filter.slice(5); arr = arr.filter((s) => isDone(s.weeks[k])); }
    else if (filter.startsWith("pend-")) { const k = filter.slice(5); arr = arr.filter((s) => !isDone(s.weeks[k])); }
    const sorted = [...arr];
    if (sortBy === "name") sorted.sort((a, b) => a.name.localeCompare(b.name, "es"));
    if (sortBy === "progress") sorted.sort((a, b) => b.overall - a.overall);
    if (sortBy === "xp") sorted.sort((a, b) => b.xp - a.xp);
    if (sortBy === "login") sorted.sort((a, b) => (b.lastLogin ? new Date(b.lastLogin) : 0) - (a.lastLogin ? new Date(a.lastLogin) : 0));
    return sorted;
  }, [scoped, query, filter, sortBy]);

  /* ---------- CSV para subir notas (se abre bien en Excel en español) ---------- */
  const exportCSV = () => {
    const quizCols = [];
    const seen = new Set();
    list.forEach((s) => s.quizzes.forEach((q) => {
      const id = `${q.period}|${q.key}`;
      if (!seen.has(id)) { seen.add(id); quizCols.push({ period: q.period, key: q.key }); }
    }));
    quizCols.sort((a, b) => keys.indexOf(a.period) - keys.indexOf(b.period));
    const pn = (k) => `P${keys.indexOf(k) + 1}`;
    const header = [
      "Usuario", "Nombre", "Grado", "Curso", "Estado", "Aceptó términos", "Último ingreso", "Progreso del año %", "Periodos completos", "XP total",
      ...keys.flatMap((k) => [`${pn(k)} %`, `${pn(k)} XP`]),
      ...quizCols.map((c) => `${pn(c.period)} ${actTitle(c.period, c.key)} (%)`),
    ];
    const rows = list.map((s) => [
      s.key, s.name, s.grade, s.course, STATUS[s.status].label, s.terms ? fmtDate(s.terms) : "No", s.lastLogin ? fmtDate(s.lastLogin) : "Nunca",
      s.overall, s.done, s.xp,
      ...keys.flatMap((k) => [Math.round(num(s.weeks[k]?.Porcentaje)), rowXP(s.weeks[k])]),
      ...quizCols.map((c) => { const q = s.quizzes.find((x) => x.period === c.period && x.key === c.key); return q ? q.pct : ""; }),
    ]);
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = "﻿" + [header, ...rows].map((r) => r.map(esc).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `FinFluent_grado${grade}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selected = students.find((s) => s.id === selectedId);
  if (selected) {
    return (
      <StudentDetail s={selected} keys={keys} course={course} schoolId={schoolId}
        onBack={() => setSelectedId(null)}
        onChanged={(leave) => { if (leave) setSelectedId(null); load(); }} />
    );
  }

  return (
    <div className="adm">
      {onExit && <button className="adm-back" onClick={onExit}><ArrowLeft size={18} strokeWidth={2.4} /> Volver a colegios</button>}
      <header className="adm-head">
        <div>
          <h1>{schoolName || data?.school?.name || "Admin"}</h1>
          <p>{updatedAt ? `Grado ${grade} · ${course.name} · actualizado ${updatedAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}` : "Cargando estudiantes…"}</p>
        </div>
        <div className="adm-actions">
          <button className="adm-btn" onClick={() => load()} disabled={loading}>
            <RefreshCw size={16} strokeWidth={2.4} className={loading ? "spin-icon" : ""} /> {loading ? "Cargando" : "Refrescar"}
          </button>
          <button className="adm-btn" onClick={exportCSV} disabled={!list.length}><Download size={16} strokeWidth={2.4} /> Notas (CSV)</button>
          <button className="adm-btn primary" onClick={() => setCreating(!creating)}><UserPlus size={16} strokeWidth={2.4} /> Crear usuarios</button>
        </div>
      </header>

      {/* ---- selector de grado con cupos ---- */}
      <div className="adm-grades" role="tablist" aria-label="Grados">
        {GRADES.map((g) => {
          const q = quotas[g] || 0, u = used[g] || 0;
          return (
            <button key={g} role="tab" aria-selected={grade === g} className={`adm-grade ${grade === g ? "on" : ""} ${!q && !u ? "empty" : ""}`} onClick={() => setGrade(g)}>
              <b>{g}°</b>
              <span>{COURSES[g].name}</span>
              <em>{u}/{q} cupos</em>
              <i><u style={{ width: `${q ? Math.min(100, (u / q) * 100) : 0}%` }} /></i>
            </button>
          );
        })}
      </div>

      {notice && <div className="adm-notice"><Check size={18} strokeWidth={2.6} /> {notice}</div>}
      {error && <div className="adm-error"><AlertTriangle size={18} strokeWidth={2.4} /> {error}</div>}

      {creating && (
        <BulkCreate grade={grade} quota={quotas[grade] || 0} used={used[grade] || 0} schoolId={schoolId}
          onClose={() => setCreating(false)}
          onCreated={(nCreated) => { setCreating(false); setNotice(`${nCreated} usuarios creados en grado ${grade}. Ya pueden entrar con su usuario y clave.`); load(); }} />
      )}

      {data && (
        <>
          <div className="adm-stats">
            <div className="adm-stat"><span className="adm-stat-ico forest"><Users size={20} /></span><div><b>{stats.total}</b><span>Estudiantes</span></div></div>
            <div className="adm-stat clickable" onClick={() => setFilter(filter === "never" ? "all" : "never")}><span className="adm-stat-ico coral"><UserX size={20} /></span><div><b>{stats.never}</b><span>Nunca entraron</span></div></div>
            <div className="adm-stat"><span className="adm-stat-ico gold"><TrendingUp size={20} /></span><div><b>{stats.avg}%</b><span>Progreso promedio</span></div></div>
            <div className="adm-stat clickable" onClick={() => setFilter(filter === "finished" ? "all" : "finished")}><span className="adm-stat-ico green"><Trophy size={20} /></span><div><b>{stats.finished}</b><span>Terminaron el grado</span></div></div>
          </div>

          <div className="adm-weeks four">
            {stats.perPeriod.map((w, i) => (
              <button key={w.k} className={`adm-week ${filter === `done-${w.k}` ? "on" : ""}`}
                onClick={() => setFilter(filter === `done-${w.k}` ? "all" : `done-${w.k}`)}>
                <small>Periodo {i + 1}</small>
                <b>{course.periods[i]?.title}</b>
                <div className="adm-week-bar"><i style={{ width: `${stats.total ? (w.done / stats.total) * 100 : 0}%` }} /></div>
                <em>{w.done}/{stats.total} completaron · {w.started} empezaron</em>
              </button>
            ))}
          </div>

          <div className="adm-toolbar">
            <label className="adm-search">
              <Search size={16} strokeWidth={2.4} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o usuario" />
            </label>
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="all">Curso: todos</option>
              {groups.map((c) => <option key={c} value={c}>Curso {c}</option>)}
              <option value="none">Sin curso</option>
            </select>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Todos</option>
              <optgroup label="Estado">{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</optgroup>
              <optgroup label="Completaron">{keys.map((k, i) => <option key={k} value={`done-${k}`}>Completaron Periodo {i + 1}</option>)}</optgroup>
              <optgroup label="Les falta">{keys.map((k, i) => <option key={k} value={`pend-${k}`}>No han terminado Periodo {i + 1}</option>)}</optgroup>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="name">Orden: nombre</option>
              <option value="progress">Orden: más avance</option>
              <option value="xp">Orden: más XP</option>
              <option value="login">Orden: ingreso reciente</option>
            </select>
            <span className="adm-count">{list.length} de {scoped.length}</span>
          </div>

          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th className="c">Curso</th>
                  <th>Estado</th>
                  <th>Último ingreso</th>
                  {keys.map((k, i) => <th key={k} className="c">P{i + 1}</th>)}
                  <th className="c">Año</th>
                  <th className="c">XP</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} onClick={() => setSelectedId(s.id)} className={s.active ? "" : "paused"}>
                    <td><div className="adm-name"><b>{s.name}</b><small>{s.key}{!s.active ? " · pausado" : ""}{!s.terms && s.lastLogin ? " · sin aceptar términos" : ""}</small></div></td>
                    <td className="c adm-num">{s.course || "—"}</td>
                    <td><span className={`adm-status ${s.status}`}>{STATUS[s.status].label}</span></td>
                    <td className="adm-login">{timeAgo(s.lastLogin)}</td>
                    {keys.map((k) => <td key={k} className="c"><PctPill row={s.weeks[k]} /></td>)}
                    <td className="c"><div className="adm-global"><div className="adm-global-bar"><i style={{ width: `${s.overall}%` }} /></div><b>{s.overall}%</b></div></td>
                    <td className="c adm-num">{s.xp}</td>
                    <td className="c"><ChevronRight size={18} strokeWidth={2.4} className="adm-chev" /></td>
                  </tr>
                ))}
                {!list.length && (
                  <tr className="no-hover"><td colSpan={10} className="adm-empty-row">
                    {students.length ? "Ningún estudiante coincide con el filtro." : `Aún no hay estudiantes en grado ${grade}. Usa "Crear usuarios" para agregarlos.`}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
