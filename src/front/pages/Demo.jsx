import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, ArrowLeft, Check, Coins, Clock, Play, Award, Printer, RotateCcw, Sparkles, School, ChevronRight,
} from "lucide-react";
import "../Styles/dashboard.css";
import "../Styles/demo.css";

// Los juegos son los MISMOS del curso (no hay copia): solo se reutilizan aquí.
import { ChainMarket, RoomRush, ROOMS } from "./Periodo1";
import { WaitGame } from "./Periodo2";
import { CrashSurvival } from "./Periodo3G11";

/* =====================================================================
   DEMO · un abrebocas de FinFluent para padres y colegios.
   - No necesita login y NO guarda nada en la base de datos.
   - Todo vive en la memoria de la página: si se recarga, empieza de cero.
   ===================================================================== */

// Pon aquí tu WhatsApp para que los colegios te escriban desde el diploma.
// Formato: código de país + número, sin "+" ni espacios. Ej.: "573001234567"
const CONTACT_WHATSAPP = "+573173769865";

const MISSIONS = [
  {
    id: "chain", e: "🔗", grade: "Grade 6", period: "From Barter to Money", time: "3 min",
    title: "The Chain Market",
    text: "No money allowed! Nobody wants what you have, so build a chain of trades to get what you need.",
    skill: "trade without money and explain why money was invented",
  },
  {
    id: "rush", e: "🛒", grade: "Grade 6", period: "The Colombian Money Museum", time: "2 min",
    title: "Money Rush",
    text: "Pay with real Colombian pesos, count your change and decide: spend it now or save it?",
    skill: "pay with Colombian pesos and count change",
  },
  {
    id: "wait", e: "🐖", grade: "Grade 6", period: "My First Financial Plan", time: "3 min",
    title: "Wait or Buy?",
    text: "Eight weeks, a $60,000 skateboard and a new temptation every week. Can you resist?",
    skill: "resist temptations to reach a saving goal",
  },
  {
    id: "crash", e: "🌪️", grade: "Grade 11", period: "Founder Year · Investing", time: "4 min",
    title: "Crash Survival",
    text: "$10,000,000 invested and a real market crash, month by month. Do you hold, sell or buy?",
    skill: "stay calm in a market crash and think long term",
  },
];

const ROOM_RUSH = ROOMS.find((r) => r.id === "rush");

export const Demo = () => {
  const [open, setOpen] = useState(null);       // misión abierta
  const [done, setDone] = useState({});         // { id: monedas }
  const [name, setName] = useState("");
  const [showCert, setShowCert] = useState(false);
  const [rushDone, setRushDone] = useState(false);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [open, showCert]);

  const total = Object.values(done).reduce((a, c) => a + c, 0);
  const count = Object.keys(done).length;
  const allDone = count === MISSIONS.length;

  // Los juegos llaman onSave al terminar: aquí solo se cuenta en memoria
  const saveFor = (id) => (payload = {}) => {
    setDone((d) => ({ ...d, [id]: Number(payload.xp) || 20 }));
    return Promise.resolve({ status: "success" });
  };
  const back = () => { setOpen(null); setRushDone(false); };
  const restart = () => { setDone({}); setName(""); setShowCert(false); setOpen(null); };

  /* ------------------------- un juego abierto ------------------------- */
  if (open) {
    let view = null;
    if (open === "chain") view = <ChainMarket onSave={saveFor("chain")} onExit={back} />;
    if (open === "wait") view = <WaitGame onSave={saveFor("wait")} onExit={back} />;
    if (open === "crash") view = <CrashSurvival demo onSave={saveFor("crash")} onExit={back} />;
    if (open === "rush") {
      view = rushDone ? (
        <div className="demo-win">
          <span>🏅</span>
          <h2>Smart Shopper!</h2>
          <p>You paid the exact price, counted your change and decided to save. That's money sense.</p>
          <div className="coin-tag big"><Coins size={18} /> +20</div>
          <button className="s1-btn primary big" onClick={back}>Back to the demo <ChevronRight size={18} /></button>
        </div>
      ) : (
        <RoomRush room={ROOM_RUSH} onExit={back} onDone={() => { saveFor("rush")({ xp: 20 }); setRushDone(true); }} />
      );
    }
    const m = MISSIONS.find((x) => x.id === open);
    return (
      <div className="demo">
        <DemoTop />
        <div className="demo-playing">
          <div className="demo-crumb">
            <button type="button" onClick={back}><ArrowLeft size={16} strokeWidth={2.4} /> All demo missions</button>
            <span>{m.e} {m.title} · <b>{m.grade}</b></span>
          </div>
          <div className="demo-stage">{view}</div>
        </div>
      </div>
    );
  }

  /* ---------------------------- diploma ---------------------------- */
  if (showCert) {
    const wa = CONTACT_WHATSAPP
      ? `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent("Hola, vi el demo de FinFluent y quiero información para mi colegio.")}`
      : null;
    return (
      <div className="demo">
        <DemoTop />
        <div className="demo-cert-wrap">
          <div className="demo-cert" id="demo-cert">
            <div className="demo-cert-top">
              <span className="demo-cert-mark"><TrendingUp size={20} strokeWidth={2.6} /></span>
              <span>Fin<b>Fluent</b> · Demo</span>
            </div>
            <small className="demo-cert-kicker">Certificate of completion</small>
            <h1>Money Explorer</h1>
            <p className="demo-cert-lead">This certifies that</p>
            <h2>{name.trim() || "A future money expert"}</h2>
            <p className="demo-cert-lead">played the FinFluent demo and can now:</p>
            <ul>
              {MISSIONS.map((m) => <li key={m.id}><Check size={16} strokeWidth={3} /> {m.skill}</li>)}
            </ul>
            <div className="demo-cert-foot">
              <div><b>{total}</b><span>coins earned</span></div>
              <div><b>4</b><span>missions</span></div>
              <div><b>2</b><span>grades tasted</span></div>
            </div>
            <p className="demo-cert-note">This is only a taste. The full course has 6 grades, 24 periods and a final diploma for each year.</p>
          </div>

          <div className="demo-cert-actions">
            <button className="s1-btn ghost" onClick={() => window.print()}><Printer size={17} /> Print / save as PDF</button>
            <button className="s1-btn ghost" onClick={restart}><RotateCcw size={17} /> Play again</button>
            {wa ? (
              <a className="s1-btn primary" href={wa} target="_blank" rel="noreferrer"><School size={17} /> I want FinFluent at my school</a>
            ) : (
              <Link className="s1-btn primary" to="/"><School size={17} /> Discover the full course</Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------- mapa del demo ------------------------- */
  return (
    <div className="demo">
      <DemoTop />

      <header className="demo-hero">
        <div className="demo-hero-copy">
          <span className="demo-badge"><Sparkles size={14} strokeWidth={2.4} /> Free demo · no account needed</span>
          <h1>Play four missions.<br /><span>Earn your money diploma.</span></h1>
          <p>
            These are real activities from the FinFluent course, the same ones students play in class.
            Three come from 6th grade and one from 11th, so you can see how the route grows.
          </p>
          <p className="demo-es">Demo para padres y colegios · todo en inglés, como en clase · nada se guarda.</p>
        </div>
        <div className="demo-score">
          <small>Your demo progress</small>
          <b>{count}<i>/4</i></b>
          <div className="demo-score-bar"><u style={{ width: `${(count / 4) * 100}%` }} /></div>
          <span><Coins size={15} /> {total} coins</span>
        </div>
      </header>

      <section className="demo-grid">
        {MISSIONS.map((m, i) => {
          const ok = done[m.id] !== undefined;
          return (
            <article key={m.id} className={`demo-card ${ok ? "ok" : ""}`}>
              <div className="demo-card-top">
                <span className="demo-n">{ok ? <Check size={16} strokeWidth={3} /> : i + 1}</span>
                <span className="demo-grade">{m.grade}</span>
                <span className="demo-time"><Clock size={13} /> {m.time}</span>
              </div>
              <em className="demo-emoji">{m.e}</em>
              <h3>{m.title}</h3>
              <small className="demo-period">{m.period}</small>
              <p>{m.text}</p>
              <button className={`s1-btn ${ok ? "ghost" : "primary"}`} onClick={() => setOpen(m.id)}>
                {ok ? <>Play again · +{done[m.id]} <Coins size={15} /></> : <><Play size={15} /> Play</>}
              </button>
            </article>
          );
        })}
      </section>

      <section className={`demo-finish ${allDone ? "on" : ""}`}>
        <span className="demo-finish-ico"><Award size={26} strokeWidth={2.2} /></span>
        <div className="demo-finish-copy">
          <h3>{allDone ? "You finished the demo!" : "Your diploma is waiting"}</h3>
          <p>{allDone ? "Write the name for the diploma." : `Complete the ${4 - count} mission${4 - count === 1 ? "" : "s"} left to unlock it.`}</p>
        </div>
        {allDone && (
          <div className="demo-finish-form">
            <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Name for the diploma" />
            <button className="s1-btn primary" onClick={() => setShowCert(true)}>Get my diploma <ChevronRight size={17} /></button>
          </div>
        )}
      </section>
    </div>
  );
};

function DemoTop() {
  return (
    <nav className="demo-top">
      <Link to="/" className="demo-logo">
        <span className="demo-logo-mark"><TrendingUp size={17} strokeWidth={2.6} /></span>
        <span>Fin<b>Fluent</b></span>
        <em>Demo</em>
      </Link>
      <div className="demo-top-actions">
        <Link to="/" className="demo-link"><ArrowLeft size={15} /> Home</Link>
        <Link to="/?login=1" className="demo-login">Log in</Link>
      </div>
    </nav>
  );
}
