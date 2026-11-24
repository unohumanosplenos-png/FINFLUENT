import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import {
  Rocket, Lock, Check, Flame, Coins, CalendarCheck, Zap, LogOut,
  Menu, X, RefreshCw, Lightbulb, ChevronLeft, ChevronRight,
  LayoutDashboard, Trophy, Award, Download, ShieldCheck,
  CloudUpload, CloudOff, TrendingUp, ListChecks, Smartphone, Building2, Eye,
} from "lucide-react";
import { loadCache, saveCache, flushPending, hasPending, pendingKeys, mergeRows } from "../progressSync";
import { api, API_URL, getSession, setSession, clearSession } from "../api";
import { usePersistentState, installDraftAutosave } from "../persist";
import { COURSES, GRADES, courseOf, ordinal } from "../courses";
import { CATALOG } from "../activityCatalog";
import "../Styles/dashboard.css";
import "../Styles/platform.css";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { TermsModal } from "../components/TermsModal";

/* =====================================================================
   PÁGINAS DE CADA PERIODO (se descargan solo cuando el estudiante las abre:
   un niño de sexto nunca baja el código de once).
   ===================================================================== */
const page = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));
const PAGES = {
  P1: page(() => import("./Periodo1"), "Periodo1"),
  P2: page(() => import("./Periodo2"), "Periodo2"),
  P3: page(() => import("./Periodo3"), "Periodo3"),
  P4: page(() => import("./Periodo4"), "Periodo4"),
  "7P1": page(() => import("./Periodo1G7"), "Periodo1G7"),
  "7P2": page(() => import("./Periodo2G7"), "Periodo2G7"),
  "7P3": page(() => import("./Periodo3G7"), "Periodo3G7"),
  "7P4": page(() => import("./Periodo4G7"), "Periodo4G7"),
  "8P1": page(() => import("./Periodo1G8"), "Periodo1G8"),
  "8P2": page(() => import("./Periodo2G8"), "Periodo2G8"),
  "8P3": page(() => import("./Periodo3G8"), "Periodo3G8"),
  "8P4": page(() => import("./Periodo4G8"), "Periodo4G8"),
  "9P1": page(() => import("./Periodo1G9"), "Periodo1G9"),
  "9P2": page(() => import("./Periodo2G9"), "Periodo2G9"),
  "9P3": page(() => import("./Periodo3G9"), "Periodo3G9"),
  "9P4": page(() => import("./Periodo4G9"), "Periodo4G9"),
  "10P1": page(() => import("./Periodo1G10"), "Periodo1G10"),
  "10P2": page(() => import("./Periodo2G10"), "Periodo2G10"),
  "10P3": page(() => import("./Periodo3G10"), "Periodo3G10"),
  "10P4": page(() => import("./Periodo4G10"), "Periodo4G10"),
  "11P1": page(() => import("./Periodo1G11"), "Periodo1G11"),
  "11P2": page(() => import("./Periodo2G11"), "Periodo2G11"),
  "11P3": page(() => import("./Periodo3G11"), "Periodo3G11"),
  "11P4": page(() => import("./Periodo4G11"), "Periodo4G11"),
};
const AdminPanel = page(() => import("./AdminPanel"), "AdminPanel");
const SuperAdmin = page(() => import("./SuperAdmin"), "SuperAdmin");

/* ---------------------------------------------------------------------
   CURSO DEMO DE 6 SEMANAS (Semana1…Semana6) · DESACTIVADO
   El código sigue en src/front/pages/SemanaN.jsx. Ahora cada usuario ve el
   curso de su grado, así que estas semanas ya no se muestran. Para volver
   a usarlas: descomenta estas líneas y agrega sus pestañas más abajo.

   const Semana1 = page(() => import("./Semana1"), "Semana1");
   const Semana2 = page(() => import("./Semana2"), "Semana2");
   const Semana3 = page(() => import("./Semana3"), "Semana3");
   const Semana4 = page(() => import("./Semana4"), "Semana4");
   const Semana5 = page(() => import("./Semana5"), "Semana5");
   const Semana6 = page(() => import("./Semana6"), "Semana6");
   const WEEKS = [
     { n: 1, title: "Money Mindset" }, { n: 2, title: "Smart Saving" }, { n: 3, title: "Money Over Time" },
     { n: 4, title: "Credit & Debt" }, { n: 5, title: "Investing 101" }, { n: 6, title: "Go Live" },
   ];
   ...y en el render:  {activeTab === "week1" && <Semana1 userData={userData} API_URL={API_URL}
                          existingRow={store.semanas?.[1]} onBack={() => setActiveTab("overview")} />}
   --------------------------------------------------------------------- */

// --- 20 tips financieros ---
// --- 20 tips financieros ---
const FINANCIAL_TIPS = [
  "Pay yourself first: automatically move a slice of every paycheck into savings before you spend anything.",
  "Track every expense for one month — most people underestimate their spending by 20% or more.",
  "Build an emergency fund covering 3 to 6 months of expenses before chasing higher returns.",
  "Compound interest rewards time more than timing — starting small and early beats waiting to invest a lot later.",
  "Avoid carrying a credit card balance; interest charges can erase months of savings in weeks.",
  "Use the 50/30/20 rule as a starting budget: 50% needs, 30% wants, 20% savings and debt payoff.",
  "Review your subscriptions every few months — forgotten ones quietly drain your budget.",
  "A high-yield savings account earns far more than a regular checking account for the same safety.",
  "Diversify your investments so one bad company or sector can't sink your whole portfolio.",
  "Know the difference between a need and a want before every purchase over your comfort threshold.",
  "Check your credit report at least once a year to catch errors or fraud early.",
  "Negotiate recurring bills like insurance and internet — loyalty rarely pays, but asking often does.",
  "Set specific savings goals with deadlines; 'save more' is vaguer and easier to abandon than 'save $500 by December'.",
  "Understand the fees on any investment account — a 1% annual fee can cost you tens of thousands over decades.",
  "Pay off your highest-interest debt first (the avalanche method) to minimize what you pay in interest overall.",
  "An emergency fund isn't for a sale — it's for job loss, medical bills, or urgent repairs.",
  "Automating your savings removes the willpower problem; you can't spend what you never see.",
  "A good credit score can save you thousands in lower interest rates on loans and mortgages.",
  "Inflation quietly reduces your money's value — cash sitting idle for years loses purchasing power.",
  "Investing isn't gambling: it's about time in the market, not timing the market.",
];

/* =====================================================================
   HELPERS
   ===================================================================== */
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 19 ? "Good afternoon" : "Good evening";
};
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);
const isCompleted = (row) => !!row && String(row.Estado || "").toLowerCase() === "completed";

/* ---------- hooks ---------- */
const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function useMedia(query) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return matches;
}

// Anima un número hasta su destino (el cohete "vuela" hacia su posición)
function useTween(target, ms = 1500) {
  const [value, setValue] = useState(0);
  const current = useRef(0);
  useEffect(() => {
    if (prefersReducedMotion()) { current.current = target; setValue(target); return; }
    const from = current.current;
    const t0 = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      current.current = from + (target - from) * eased;
      setValue(current.current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

/* ---------- geometría de la ruta de vuelo ---------- */
// Dos composiciones: ancha (desktop) y compacta (móvil). Ambas escalan de forma uniforme.
const CHART = {
  wide: { w: 1000, h: 340, pts: [[26, 262], [160, 238], [290, 250], [420, 192], [560, 204], [690, 134], [790, 120], [930, 46]] },
  compact: { w: 600, h: 480, pts: [[30, 400], [120, 362], [200, 378], [290, 300], [380, 312], [450, 210], [510, 194], [562, 70]] },
};

// Catmull-Rom → Bézier: curva suave que pasa por todos los puntos
function smoothPath(pts) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

// Silueta de montañas (crestas alternadas subiendo hacia la derecha)
function ridge(w, h, n, amp, left, right, seed) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const x = (i * w) / n;
    const base = h * (left + (right - left) * (i / n));
    const peak = i % 2 ? 0 : amp * (0.7 + 0.3 * Math.sin(i * 2.3 + seed));
    pts.push(`${x.toFixed(1)},${(base - peak).toFixed(1)}`);
  }
  return `M0,${h} L${pts.join(" L")} L${w},${h} Z`;
}

// Textura guilloche (las líneas entrelazadas de los billetes)
const GUILLOCHE = Array.from({ length: 18 }, (_, i) => {
  const pts = [];
  for (let x = 0; x <= 800; x += 10) {
    const y = 100 + 46 * Math.sin(x / 38 + i * 0.36) * Math.cos(x / 210 + i * 0.5);
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return "M" + pts.join(" L");
});

/* =====================================================================
   GROWTH TRACK · el cohete avanza una parada por cada periodo terminado
   ===================================================================== */
function GrowthTrack({ fraction, pct, stops, states, done, level, celebrate }) {
  const N = stops.length;
  const compact = useMedia("(max-width: 640px)");
  const cfg = compact ? CHART.compact : CHART.wide;
  const pathRef = useRef(null);
  const [geo, setGeo] = useState(null);
  const f = useTween(fraction);

  const d = useMemo(() => smoothPath(cfg.pts), [cfg]);
  const last = cfg.pts[cfg.pts.length - 1];
  const first = cfg.pts[0];
  const area = useMemo(() => `${d} L${last[0]},${cfg.h} L${first[0]},${cfg.h} Z`, [d, cfg, last, first]);
  const ridges = useMemo(() => [
    ridge(cfg.w, cfg.h, 9, cfg.h * 0.18, 0.7, 0.36, 0.4),
    ridge(cfg.w, cfg.h, 13, cfg.h * 0.12, 0.9, 0.64, 1.9),
  ], [cfg]);

  // Mide la curva y ubica los puntos (inicio + N periodos) equidistantes sobre ella
  useLayoutEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const L = p.getTotalLength();
    setGeo({
      L,
      nodes: Array.from({ length: N + 1 }, (_, k) => {
        const pt = p.getPointAtLength((L * k) / N);
        return { x: pt.x, y: pt.y };
      }),
    });
  }, [d, N]);

  // Posición y ángulo del cohete = tangente exacta de la curva
  let rocket = null;
  if (geo && pathRef.current) {
    const p = pathRef.current;
    const at = Math.min(Math.max(f, 0), 1) * geo.L;
    const a = p.getPointAtLength(Math.max(0, at - 8));
    const b = p.getPointAtLength(Math.min(geo.L, at + 8));
    const c = p.getPointAtLength(at);
    rocket = { x: c.x, y: c.y, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI };
  }

  const currentIdx = states.findIndex((s) => !s.done);
  const nextStop = currentIdx >= 0 ? stops[currentIdx] : null;
  const headline = done >= N ? "You reached the summit" : done === 0 ? "Ready for takeoff" : `${done} of ${N} periods done`;
  const subline = nextStop ? `Next stop: Period ${nextStop.n}, ${nextStop.title}.` : "All four periods complete. Your diploma is waiting below.";
  const px = (x) => `${(x / cfg.w) * 100}%`;
  const py = (y) => `${(y / cfg.h) * 100}%`;

  return (
    <section className="growth-card" aria-label="Course progress">
      {/* fondo: guilloche + resplandor en la cima */}
      <svg className="growth-guilloche" viewBox="0 0 800 200" preserveAspectRatio="none" aria-hidden="true">
        {GUILLOCHE.map((dd, i) => <path key={i} d={dd} />)}
      </svg>
      <span className="growth-sun" aria-hidden="true" />

      <div className="growth-head">
        <div>
          <h2>{headline}</h2>
          <p>{subline}</p>
        </div>
        <div className="growth-chips">
          <span className="growth-chip"><Zap size={14} strokeWidth={2.4} /> Level {level}</span>
          <span className="growth-chip">{pct}% of the route</span>
        </div>
      </div>

      <div
        className="flight"
        style={{ aspectRatio: `${cfg.w} / ${cfg.h}` }}
        role="img"
        aria-label={`${done} of ${N} periods completed, ${pct}% of the year`}
      >
        <svg className="flight-svg" viewBox={`0 0 ${cfg.w} ${cfg.h}`} aria-hidden="true">
          <defs>
            <linearGradient id="flightStroke" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#f5b23e" />
              <stop offset="1" stopColor="#8ff0c2" />
            </linearGradient>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#16b074" stopOpacity=".42" />
              <stop offset="1" stopColor="#16b074" stopOpacity="0" />
            </linearGradient>
            <clipPath id="traveled">
              <rect x="0" y="0" width={rocket ? rocket.x : 0} height={cfg.h} />
            </clipPath>
          </defs>

          {[0.25, 0.5, 0.75].map((t) => (
            <line key={t} className="flight-grid" x1="0" x2={cfg.w} y1={cfg.h * t} y2={cfg.h * t} />
          ))}
          <path className="ridge-back" d={ridges[0]} />
          <path className="ridge-front" d={ridges[1]} />
          <path d={area} fill="url(#areaFill)" clipPath="url(#traveled)" />
          <path ref={pathRef} className="flight-base" d={d} />
          {geo && (
            <path
              className="flight-done"
              d={d}
              stroke="url(#flightStroke)"
              strokeDasharray={`${f * geo.L} ${geo.L + 2}`}
            />
          )}
        </svg>

        {celebrate && (
          <div className="growth-toast" role="status">
            <Trophy size={16} strokeWidth={2.4} /> Period complete. The rocket moves on!
          </div>
        )}

        {geo && (
          <>
            {/* punto de partida */}
            <div className="fnode start" style={{ left: px(geo.nodes[0].x), top: py(geo.nodes[0].y) }}>
              <span className="fnode-dot small" />
              <span className="fnode-label start-label">Start</span>
            </div>

            {/* los periodos del grado */}
            {stops.map((w, i) => {
              if (!geo.nodes[i + 1]) return null;
              const pt = geo.nodes[i + 1];
              const st = states[i];
              const isCurrent = i === currentIdx;
              const xr = pt.x / cfg.w;
              const align = xr > 0.85 ? "end" : xr < 0.12 ? "begin" : "";
              const NodeIcon = w.Icon;
              return (
                <div
                  key={w.n}
                  className={`fnode ${st.done ? "done" : ""} ${isCurrent ? "current" : ""} ${align}`}
                  style={{ left: px(pt.x), top: py(pt.y) }}
                >
                  <span className="fnode-dot">
                    {st.done ? <Check size={17} strokeWidth={3} /> : <NodeIcon size={16} strokeWidth={2.2} />}
                  </span>
                  <span className="fnode-label"><b>Period {w.n}</b>{w.short || w.title}</span>
                </div>
              );
            })}

            {/* cohete */}
            {rocket && (
              <div className="rocket" style={{ left: px(rocket.x), top: py(rocket.y) }}>
                <span className="rocket-trail" style={{ transform: `rotate(${rocket.angle}deg)` }}><i /></span>
                {celebrate && <span className="rocket-burst" />}
                <span className="rocket-badge">
                  <Rocket size={24} strokeWidth={2.2} style={{ transform: `rotate(${rocket.angle + 45}deg)` }} />
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/* =====================================================================
   LEDGER (stats en una sola tira tipo recibo)
   ===================================================================== */
function Ledger({ stats, total }) {
  const left = total - stats.done;
  return (
    <div className="ledger-wrap">
      <div className="ledger">
        <div className="ledger-item xp">
          <span className="ledger-ico"><Coins size={20} strokeWidth={2.2} /></span>
          <div className="ledger-body">
            <b className="ledger-num">{stats.xp}</b>
            <span className="ledger-label">XP earned</span>
            <span
              className="ledger-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={stats.levelPct}
              aria-label={`Progress to level ${stats.level + 1}`}
            >
              <i style={{ width: `${stats.levelPct}%` }} />
            </span>
            <span className="ledger-sub">{stats.xpToNext} XP to level {stats.level + 1}</span>
          </div>
        </div>

        <div className="ledger-item streak">
          <span className="ledger-ico"><Flame size={20} strokeWidth={2.2} /></span>
          <div className="ledger-body">
            <b className="ledger-num">{stats.streak}</b>
            <span className="ledger-label">day streak</span>
            <span className="ledger-sub">{stats.streak > 0 ? "Play today to keep it going" : "Play today to start one"}</span>
          </div>
        </div>

        <div className="ledger-item weeks">
          <span className="ledger-ico"><CalendarCheck size={20} strokeWidth={2.2} /></span>
          <div className="ledger-body">
            <b className="ledger-num">{stats.done}<small>/{total}</small></b>
            <span className="ledger-label">periods completed</span>
            <span className="ledger-sub">{left === 0 ? "Every period done" : `${left} to go`}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
/* =====================================================================
   STATUS TICKET (boarding pass del periodo en curso)
   ===================================================================== */
const actsOf = (key) => (CATALOG[key]?.weeks || []).reduce((a, w) => a + w.acts.length, 0);
const parseJ = (s) => { if (!s) return {}; if (typeof s === "object") return s; try { return JSON.parse(s); } catch { return {}; } };

function StatusTicket({ course, grade, current, row, allDone, locked, onOpen }) {
  let m;
  if (allDone) {
    m = {
      Icon: Trophy,
      title: `${ordinal(grade)} grade complete`,
      text: `You finished all 4 periods of ${course.name}. Your diploma is ready to download.`,
      stub: { Icon: Trophy, label: "All periods done" },
    };
  } else {
    const pct = Math.round(parseFloat(row?.Porcentaje || 0));
    const total = actsOf(current.key);
    const done = Object.values(parseJ(row?.Checklist_JSON)).filter(Boolean).length;
    m = {
      Icon: current.Icon,
      title: `Period ${current.n}: ${current.title}`,
      text: current.question,
      chip: total ? `${Math.min(done, total)} of ${total} activities done` : null,
      stub: { num: `${pct}%`, label: "of this period" },
      cta: locked ? null : { label: `${pct > 0 ? "Continue" : "Start"} period ${current.n}` },
    };
  }
  const TicketIcon = m.Icon;
  const StubIcon = m.stub.Icon;
  return (
    <div className="ticket-wrap">
      <article className="ticket">
        <div className="ticket-main">
          <span className="ticket-ico"><TicketIcon size={22} strokeWidth={2.1} /></span>
          <h3>{m.title}</h3>
          <p>{m.text}</p>
          {m.chip && <span className="ticket-dates"><ListChecks size={15} strokeWidth={2.2} /> {m.chip}</span>}
          {m.cta && <button className="btn-status-cta" onClick={onOpen}>{m.cta.label}</button>}
        </div>
        <div className="ticket-stub">
          {StubIcon ? <StubIcon className="stub-icon" size={34} strokeWidth={2.2} /> : <b className="stub-num pct">{m.stub.num}</b>}
          <span className="stub-label">{m.stub.label}</span>
          <span className="barcode" aria-hidden="true" />
        </div>
      </article>
    </div>
  );
}

/* =====================================================================
   TIP NOTE (index card)
   ===================================================================== */
function TipNote({ index, onPrev, onNext, onPause }) {
  return (
    <aside
      className="note"
      onMouseEnter={() => onPause(true)}
      onMouseLeave={() => onPause(false)}
      onFocus={() => onPause(true)}
      onBlur={() => onPause(false)}
    >
      <div className="note-head">
        <h3><Lightbulb size={18} strokeWidth={2.2} /> Money tip</h3>
        <span className="note-count">{index + 1} of {FINANCIAL_TIPS.length}</span>
      </div>
      <p key={index} className="note-text">{FINANCIAL_TIPS[index]}</p>
      <div className="note-nav">
        <button onClick={onPrev} aria-label="Previous tip"><ChevronLeft size={18} strokeWidth={2.4} /></button>
        <button onClick={onNext} aria-label="Next tip"><ChevronRight size={18} strokeWidth={2.4} /></button>
      </div>
    </aside>
  );
}

/* =====================================================================
   SYNC BADGE · le dice al estudiante si su progreso ya está a salvo
   ===================================================================== */
function SyncBadge({ sync }) {
  const vals = Object.values(sync || {});
  const status = vals.includes("offline") ? "offline" : vals.includes("saving") ? "saving" : vals.length ? "saved" : null;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!status) return;
    setVisible(true);
    if (status === "saved") {
      const t = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(t);
    }
  }, [status]);

  if (!status || !visible) return null;
  const cfg = {
    saving: { Icon: CloudUpload, text: "Uploading your progress to the database…" },
    saved: { Icon: ShieldCheck, text: "Progress saved ✓ It won't be lost." },
    offline: { Icon: CloudOff, text: "Saved on this device. Uploading as soon as you're online…" },
  }[status];
  const Icon = cfg.Icon;
  return (
    <div className={`sync-badge ${status}`} role="status" aria-live="polite">
      <Icon size={16} strokeWidth={2.4} className={status === "saving" ? "sync-pulse" : ""} />
      <span>{cfg.text}</span>
    </div>
  );
}

/* =====================================================================
   DIPLOMA · aparece al completar los 4 periodos del grado.
   Lleva el nombre y escudo del colegio del estudiante, lo que ahora es
   capaz de hacer, y la mención a FinFluent como responsable del programa.
   ===================================================================== */
function Certificate({ name, grade, course, school, onDownload, downloading }) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const schoolName = school?.name || "FinFluent Academy";
  return (
    <section className="cert-wrap">
      <div className="cert-hd">
        <h2><Award size={20} strokeWidth={2.2} /> You completed {ordinal(grade)} grade. Here is your diploma!</h2>
        <button className="btn-cert-dl" onClick={onDownload} disabled={downloading}>
          <Download size={16} strokeWidth={2.4} /> {downloading ? "Preparing…" : "Download diploma"}
        </button>
      </div>

      {/* Este nodo es EXACTAMENTE lo que se exporta a imagen */}
      <div className="cert" id="fin-certificate">
        <div className="cert-inner">
          {school?.logo
            ? <img className="cert-crest" src={school.logo} alt={schoolName} />
            : <span className="cert-crest-fallback"><TrendingUp size={34} strokeWidth={2.4} /></span>}
          <p className="cert-school">{schoolName}</p>
          <p className="cert-eyebrow">FinFluent · Financial Education in English · Grade {grade}</p>
          <h1 className="cert-title">Diploma of Financial Fluency</h1>
          <p className="cert-pre">This certifies that</p>
          <p className="cert-name">{name}</p>
          <p className="cert-body">
            completed the four periods of <b>{course.name}</b>, the {ordinal(grade)} grade <b>FinFluent</b> program
            ({course.periods.map((p) => p.title).join(" · ")}), learning finance in English, and is now able to:
          </p>
          <ul className="cert-can">
            {course.canDo.map((c) => <li key={c}><Check size={15} strokeWidth={3} /> {c}</li>)}
          </ul>
          <div className="cert-foot">
            <div className="cert-sig">
              <span className="cert-sig-name">{school?.signer_name || "FinFluent"}</span>
              <span className="cert-sig-line" />
              <span className="cert-sig-who">{school?.signer_name || "Academic Direction"}</span>
              <span>{[school?.signer_role, schoolName].filter(Boolean).join(" · ")}</span>
            </div>
            <div className="cert-seal" aria-label="Certified by FinFluent">
              <span className="cert-seal-mark"><TrendingUp size={20} strokeWidth={2.8} /></span>
              <b>FinFluent</b>
              <small>program responsible<br />for this learning</small>
            </div>
            <div className="cert-date"><span className="cert-date-val">{today}</span><span>Date</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   AVISO: en tablet, vertical se trabaja mejor (el teclado no tapa la actividad)
   ===================================================================== */
function RotateHint() {
  const landscapeTouch = useMedia("(orientation: landscape) and (pointer: coarse) and (max-height: 900px)");
  const [closed, setClosed] = useState(false);
  if (!landscapeTouch || closed) return null;
  return (
    <div className="rotate-hint" role="status">
      <span className="rotate-ico"><Smartphone size={20} strokeWidth={2.2} /></span>
      <p><b>Turn your tablet to vertical.</b> The keyboard covers the activity when the screen is horizontal. Vertical gives you room to write.</p>
      <button onClick={() => setClosed(true)}>Got it</button>
    </div>
  );
}

/* Si una actividad falla, el estudiante no se queda con la pantalla en blanco */
class ActivityBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error("Activity crashed:", error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="soon-inner boundary">
        <h2>Something went wrong here</h2>
        <p>Your saved progress is safe. Go back to the dashboard and open the activity again.</p>
        <button className="btn-status-cta" onClick={this.props.onReset}>Back to dashboard</button>
      </div>
    );
  }
}

const Loader = ({ text = "Loading…" }) => (
  <div className="fin-loading inline"><div><div className="spin"></div><p>{text}</p></div></div>
);

/* =====================================================================
   DASHBOARD
   ===================================================================== */
export const Dashboard = ({ onLogout }) => {
  const { store, dispatch } = useGlobalReducer();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(() => getSession());
  const rolUpper = String(userData?.Rol || "").trim().toUpperCase();
  const isSuper = rolUpper === "SUPERADMIN";
  const isAdmin = rolUpper === "ADMIN" || isSuper;

  // Pestaña activa: "overview" | "admin" | "super" | llave de periodo (P1, 7P3…). Sobrevive al refresh.
  const [activeTab, setActiveTab] = usePersistentState("tab", isSuper ? "super" : isAdmin ? "admin" : "overview");
  // Los admins no tienen grado: eligen cuál curso quieren recorrer (vista previa)
  const [previewGrade, setPreviewGrade] = usePersistentState("previewGrade", "6");
  const [isLoading, setIsLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [tipIndex, setTipIndex] = useState(() => new Date().getDate() % FINANCIAL_TIPS.length);
  const [tipPaused, setTipPaused] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const prevDoneRef = useRef(null);

  const grade = isAdmin ? previewGrade : String(userData?.Grado || "");
  const course = courseOf(grade);
  const periods = course?.periods || [];
  const school = userData?.School || null;

  // Descarga el diploma como PNG (carga html2canvas desde CDN la primera vez)
  const downloadCertificate = async () => {
    setDownloading(true);
    try {
      if (!window.html2canvas) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          s.onload = resolve; s.onerror = reject;
          document.body.appendChild(s);
        });
      }
      if (document.fonts?.ready) await document.fonts.ready; // espera la letra cursiva de la firma
      const node = document.getElementById("fin-certificate");
      const canvas = await window.html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const link = document.createElement("a");
      link.download = `FinFluent-Diploma-Grade${grade}-${(userData?.Nombre_Completo || "student").replace(/\s+/g, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("No se pudo generar el diploma:", e);
      alert("Couldn't generate the diploma. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  /* ---------- carga inicial ---------- */
  useEffect(() => {
    const data = getSession();
    if (!data?.token) { navigate("/"); return; }
    installDraftAutosave();                                                // borradores de lo que se escribe
    dispatch({ type: "set_semanas", payload: loadCache(data.Student_Key) }); // 1) lo guardado en este equipo
    flushPending(API_URL, data.Student_Key, dispatch);                     // 2) sube lo que quedó pendiente
    loadProgreso(data.Student_Key);                                        // 3) lo del servidor (se une, no pisa)
    // 4) perfil fresco: racha, grado y datos del colegio (para el diploma)
    api("/auth/me").then((me) => {
      if (me?.status !== "success") return;
      const next = { ...data, ...me, token: data.token };
      setSession(next); setUserData(next);
    }).catch(() => {});
  }, [navigate]); // eslint-disable-line

  // Copia local de TODO el progreso cada vez que cambia
  useEffect(() => {
    if (userData?.Student_Key) saveCache(userData.Student_Key, store.semanas);
  }, [store.semanas, userData]);

  // Avisa si intentan cerrar con datos sin subir
  useEffect(() => {
    const h = (e) => {
      if (userData?.Student_Key && hasPending(userData.Student_Key)) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [userData]);

  // Trae del servidor TODAS las filas del estudiante (4 periodos, con sus respuestas)
  const loadProgreso = async (key) => {
    if (!key) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const data = await api("/progress");
      if (!Array.isArray(data)) return;
      const bySemana = {};
      data.forEach((row) => {
        const sem = row && row.Semana;
        if (sem != null && sem !== "") bySemana[sem] = mergeRows(bySemana[sem], row);
      });
      dispatch({ type: "sync_server", payload: { rows: bySemana, keep: pendingKeys(key) } });
    } catch (e) {
      console.error("Error cargando progreso:", e);
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------- métricas derivadas (del grado que se está viendo) ---------- */
  const getRow = (key) => store.semanas?.[key];
  const stats = useMemo(() => {
    const rows = periods.map((p) => store.semanas?.[p.key]).filter(Boolean);
    const xpRaw = rows.reduce(
      (s, r) => s + parseFloat(r.Puntos_Comportamiento || 0) + parseFloat(r.Puntos_Quizzes || 0) + parseFloat(r.Puntos_Aprendi || 0),
      0
    );
    const xp = Math.round(xpRaw) || 0;
    const done = rows.filter(isCompleted).length;
    // % del año = promedio del % de los 4 periodos: el cohete llega a cada parada al cerrar un periodo
    const raw = periods.length ? rows.reduce((s, r) => s + parseFloat(r.Porcentaje || 0), 0) / periods.length : 0;
    const overallRaw = Math.max(0, Math.min(100, Number.isFinite(raw) ? raw : 0));
    const level = Math.floor(xp / 100) + 1;
    const streak = parseInt(userData?.Racha_Dias || 0) || 0;
    return { xp, done, level, streak, overallRaw, overall: Math.round(overallRaw), levelPct: xp % 100, xpToNext: 100 - (xp % 100) };
  }, [store.semanas, userData, grade]); // eslint-disable-line

  // Periodo N abierto si: es el 1, el colegio no exige orden, es admin, o el N-1 está completo.
  const isUnlocked = (p) => {
    if (p.n === 1 || isAdmin || !school?.lock_periods) return true;
    return isCompleted(getRow(periods[p.n - 2]?.key));
  };

  /* ---------- celebración al completar un periodo ---------- */
  useEffect(() => {
    if (prevDoneRef.current !== null && stats.done > prevDoneRef.current) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 3200);
      prevDoneRef.current = stats.done;
      return () => clearTimeout(t);
    }
    prevDoneRef.current = stats.done;
  }, [stats.done]);

  /* ---------- rotación automática de tips (se pausa al interactuar) ---------- */
  useEffect(() => {
    if (tipPaused) return;
    const id = setInterval(() => setTipIndex((i) => (i + 1) % FINANCIAL_TIPS.length), 10000);
    return () => clearInterval(id);
  }, [tipPaused]);
  const nextTip = () => setTipIndex((i) => (i + 1) % FINANCIAL_TIPS.length);
  const prevTip = () => setTipIndex((i) => (i - 1 + FINANCIAL_TIPS.length) % FINANCIAL_TIPS.length);

  /* ---------- acciones ---------- */
  const handleLogout = () => {
    if (userData?.Student_Key && hasPending(userData.Student_Key)) {
      const ok = window.confirm("Some of your progress is still uploading.\n\nIt is saved on this device and will upload the next time you log in HERE. Log out anyway?");
      if (!ok) return;
    }
    clearSession();
    dispatch({ type: "reset_store" });
    if (onLogout) onLogout();
    navigate("/");
  };
  const go = (tab) => { setActiveTab(tab); setNavOpen(false); window.scrollTo(0, 0); };
  const openPeriod = (p) => { if (isUnlocked(p)) go(p.key); };

  if (!userData) return <div className="fin-loading"><div><div className="spin"></div><p>Loading your progress…</p></div></div>;

  const states = periods.map((p) => ({ key: p.key, done: isCompleted(getRow(p.key)), unlocked: isUnlocked(p) }));
  const currentIdx = Math.max(0, states.findIndex((s) => !s.done));
  const allDone = periods.length > 0 && states.every((s) => s.done);
  const current = periods[allDone ? periods.length - 1 : currentIdx];
  // El super admin no acepta términos; estudiantes y admins de colegio sí (y otra vez si cambia la versión)
  const needsTerms = !isSuper && !!userData.Terminos_Vigentes && userData.Terminos_Version !== userData.Terminos_Vigentes;
  const firstName = userData.Nombre_Completo?.split(" ")[0] || "there";
  const roleLabel = isSuper ? "Super admin" : isAdmin ? "Admin" : `Grade ${grade}`;
  const openPeriodDef = periods.find((p) => p.key === activeTab);
  const PeriodPage = openPeriodDef ? PAGES[openPeriodDef.key] : null;
  // Si la pestaña guardada ya no aplica (cambió de grado, perdió permisos…), vuelve al inicio
  const tabValid = activeTab === "overview" || (activeTab === "admin" && isAdmin) || (activeTab === "super" && isSuper) || !!PeriodPage;
  const tab = tabValid ? activeTab : "overview";

  return (
    <div className={`fin-dash ${navOpen ? "nav-open" : ""}`}>
      {/* Términos y tratamiento de datos: obligatorio antes de usar la plataforma */}
      {needsTerms && (
        <TermsModal
          version={userData.Terminos_Vigentes}
          schoolName={school?.name}
          onLogout={handleLogout}
          onAccepted={(res) => {
            const next = { ...userData, ...res, token: userData.token };
            setSession(next); setUserData(next);
          }}
        />
      )}
      <SyncBadge sync={store.sync} />
      <RotateHint />
      {/* barra superior móvil */}
      <div className="fin-mobile-top">
        <div className="fin-brand-min">
          <span className="logo-chip"><TrendingUp size={17} strokeWidth={2.6} /></span>
          Fin<b>Fluent</b>
        </div>
        <button className="fin-burger" onClick={() => setNavOpen(!navOpen)} aria-label={navOpen ? "Close menu" : "Open menu"}>
          {navOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {navOpen && <div className="fin-overlay" onClick={() => setNavOpen(false)}></div>}

      {/* ---------------- SIDEBAR ---------------- */}
      <aside className="fin-side">
        <button className="fin-side-brand" onClick={() => go("overview")}>
          <span className="logo-chip"><TrendingUp size={20} strokeWidth={2.6} /></span>
          <span>Fin<b>Fluent</b></span>
        </button>

        <div className="fin-user">
          <div className="fin-avatar">{userData.Nombre_Completo?.charAt(0) || "S"}</div>
          <div className="fin-user-info">
            <h4>{userData.Nombre_Completo}</h4>
            <div className="fin-user-chips">
              <span className="fin-chip lvl"><Zap size={12} strokeWidth={2.6} /> Level {stats.level}</span>
              <span className="fin-chip">{roleLabel}</span>
            </div>
          </div>
        </div>
        {school?.name && <div className="fin-school"><Building2 size={14} strokeWidth={2.3} /> {school.name}</div>}

        {isSuper && (
          <button className={`fin-nav-btn ${tab === "super" ? "active" : ""}`} onClick={() => go("super")} aria-current={tab === "super" ? "page" : undefined}>
            <span className="nav-ico"><Building2 size={18} strokeWidth={2.2} /></span>
            Colegios
          </button>
        )}
        {isAdmin && !isSuper && (
          <button className={`fin-nav-btn ${tab === "admin" ? "active" : ""}`} onClick={() => go("admin")} aria-current={tab === "admin" ? "page" : undefined}>
            <span className="nav-ico"><ShieldCheck size={18} strokeWidth={2.2} /></span>
            Admin
          </button>
        )}

        {isAdmin && (
          <label className="fin-preview">
            <span><Eye size={14} strokeWidth={2.3} /> Vista previa del curso</span>
            <select value={previewGrade} onChange={(e) => { setPreviewGrade(e.target.value); if (PeriodPage) go("overview"); }}>
              {GRADES.map((g) => <option key={g} value={g}>Grado {g} · {COURSES[g].name}</option>)}
            </select>
          </label>
        )}

        <button className={`fin-nav-btn ${tab === "overview" ? "active" : ""}`} onClick={() => go("overview")} aria-current={tab === "overview" ? "page" : undefined}>
          <span className="nav-ico"><LayoutDashboard size={18} strokeWidth={2.2} /></span>
          Overview
        </button>

        {course && (
          <>
            <div className="fin-nav-label">Your route · Grade {grade}</div>
            <nav className="fin-route" aria-label="Course periods">
              {periods.map((p, i) => {
                const st = states[i];
                const active = tab === p.key;
                const locked = !st.unlocked;
                return (
                  <button
                    key={p.key}
                    className={`fin-nav-btn is-week ${active ? "active" : ""} ${st.done ? "done" : ""} ${locked ? "locked" : ""}`}
                    onClick={() => openPeriod(p)}
                    aria-current={active ? "page" : undefined}
                    aria-disabled={locked || undefined}
                    title={locked ? "Unlocks after the previous period" : p.title}
                  >
                    <span className="wk-mark">
                      {locked ? <Lock size={13} strokeWidth={2.4} /> : st.done ? <Check size={15} strokeWidth={3} /> : p.n}
                    </span>
                    <span className="wk-name">{p.short || p.title}</span>
                  </button>
                );
              })}
            </nav>
          </>
        )}

        <div className="fin-side-foot">
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={17} strokeWidth={2.2} /> Log out
          </button>
        </div>
      </aside>

      {/* ---------------- MAIN ---------------- */}
      <main className="fin-main">

        {/* ===== OVERVIEW ===== */}
        {tab === "overview" && !course && (
          <div className="soon-inner boundary">
            <h2>Your user has no grade yet</h2>
            <p>Ask your teacher to assign your grade (6 to 11) so your course appears here.</p>
          </div>
        )}

        {tab === "overview" && course && (
          <>
            <header className="fin-header">
              <div>
                <h1>{greeting()}, {firstName}</h1>
                <p>{isAdmin ? `Vista previa · Grade ${grade}: ${course.name}.` : `Grade ${grade} · ${course.name}. ${course.tagline}`}</p>
              </div>
              <button className="btn-sync" onClick={() => loadProgreso(userData.Student_Key)} disabled={isLoading}>
                <RefreshCw size={16} strokeWidth={2.4} className={isLoading ? "spin-icon" : ""} />
                {isLoading ? "Syncing" : "Sync"}
              </button>
            </header>

            <div className="overview-stack">
              {allDone && (
                <Certificate name={userData.Nombre_Completo} grade={grade} course={course} school={school}
                  onDownload={downloadCertificate} downloading={downloading} />
              )}

              <GrowthTrack
                fraction={stats.overallRaw / 100}
                pct={stats.overall}
                stops={periods}
                states={states}
                done={stats.done}
                level={stats.level}
                celebrate={celebrate}
              />

              <Ledger stats={stats} total={periods.length} />

              <div className="insight-grid">
                <StatusTicket course={course} grade={grade} current={current} row={getRow(current.key)}
                  allDone={allDone} locked={!states[periods.indexOf(current)]?.unlocked} onOpen={() => openPeriod(current)} />
                <TipNote index={tipIndex} onPrev={prevTip} onNext={nextTip} onPause={setTipPaused} />
              </div>
            </div>
          </>
        )}

        {/* ===== PERIODO ABIERTO (el del grado del estudiante) ===== */}
        {PeriodPage && tab === openPeriodDef.key && (
          <ActivityBoundary key={openPeriodDef.key} onReset={() => {
            try { Object.keys(sessionStorage).filter((k) => k.startsWith("finNav_") && k.includes(`_${openPeriodDef.key}:`)).forEach((k) => sessionStorage.removeItem(k)); } catch { /* nada */ }
            go("overview");
          }}>
            <Suspense fallback={<Loader text={`Opening period ${openPeriodDef.n}…`} />}>
              <PeriodPage
                userData={userData}
                API_URL={API_URL}
                existingRow={store.semanas?.[openPeriodDef.key]}
                onBack={() => go("overview")}
              />
            </Suspense>
          </ActivityBoundary>
        )}

        {/* ===== ADMIN DEL COLEGIO ===== */}
        {tab === "admin" && isAdmin && !isSuper && (
          <Suspense fallback={<Loader />}><AdminPanel userData={userData} /></Suspense>
        )}

        {/* ===== SUPER ADMIN: colegios, cupos y admins ===== */}
        {tab === "super" && isSuper && (
          <Suspense fallback={<Loader />}><SuperAdmin userData={userData} /></Suspense>
        )}
      </main>
    </div>
  );
};
