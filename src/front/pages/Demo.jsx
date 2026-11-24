import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, ArrowLeft, Check, Coins, Clock, Play, Award, Printer, RotateCcw, Sparkles, School,
  ChevronRight, Lightbulb, Target, Trophy, GraduationCap, HelpCircle, X, Lock,
} from "lucide-react";
import "../Styles/dashboard.css";
import "../Styles/demo.css";

// Los juegos son los MISMOS del curso (no hay copia): solo se reutilizan aquí.
import { ChainMarket, RoomRush, ROOMS } from "./Periodo1";
import { Millionaire } from "./Periodo4G11";
import { CrashSurvival } from "./Periodo3G11";

/* =====================================================================
   DEMO · un abrebocas de FinFluent para padres y colegios.
   - No necesita login y NO guarda nada en la base de datos.
   - Todo vive en la memoria de la página: si se recarga, empieza de cero.
   - Los textos del demo están en inglés y en español; los juegos, en
     inglés, igual que en clase.
   ===================================================================== */

// Pon aquí tu WhatsApp para que los colegios te escriban desde el diploma.
// Formato: código de país + número, sin "+" ni espacios. Ej.: "573001234567"
const CONTACT_WHATSAPP = "";

const ROOM_RUSH = ROOMS.find((r) => r.id === "rush");

// Las mismas clases que usa cada periodo del curso para envolver sus actividades
// (traen los colores y estilos propios de cada grado).
const G11 = "s1 p1 p2 p3 p4 g7 g72 g73 g74 g8 g82 g83 g84 g9 g91 g92 g93 g94 g10 g11";
const WRAP = { chain: "s1 p1", rush: "s1 p1", mill: `${G11} g114`, crash: `${G11} g113` };

/* ---------------------------- textos ---------------------------- */
const MISSIONS = [
  {
    id: "chain", e: "🔗", time: 3, tone: "mint",
    en: {
      tag: "Barter", title: "The Chain Market",
      card: "No money allowed! Nobody wants what you have, so trade your way to what you need.",
      fact: "Before money existed, people used barter: they traded things directly. A fisherman who wanted shoes had to find a shoemaker who wanted fish. Economists call this the “double coincidence of wants”, and it made trading slow and hard. That problem is why money was invented.",
      steps: [
        "At the top you see what you HAVE and what you WANT.",
        "Read each trader's card: what they have and what they want.",
        "Offer your object only to the trader who wants it. You get their object in return.",
        "Keep trading, object by object, until you reach your goal. Then go to the next level.",
      ],
      win: "Reach the goal in every level. Read carefully: fewer wrong offers means more coins.",
      tip: "Look at the “Wants” line on each card before you offer.",
      skill: "trade without money and explain why money was invented",
      learn: "Why money exists",
    },
    es: {
      tag: "Trueque", title: "El mercado en cadena",
      card: "¡Aquí no hay dinero! Nadie quiere lo que tienes: cambia y cambia hasta llegar a lo que necesitas.",
      fact: "Antes de que existiera el dinero, la gente usaba el trueque: cambiaba cosas directamente. Un pescador que quería zapatos tenía que encontrar a un zapatero que quisiera pescado. Los economistas lo llaman la “doble coincidencia de deseos”, y hacía que comerciar fuera lento y difícil. Por ese problema se inventó el dinero.",
      steps: [
        "Arriba ves lo que TIENES y lo que QUIERES.",
        "Lee la tarjeta de cada comerciante: qué tiene y qué quiere.",
        "Ofrece tu objeto solo a quien lo quiere. A cambio, recibes el suyo.",
        "Sigue cambiando, objeto por objeto, hasta llegar a tu meta. Luego pasas al siguiente nivel.",
      ],
      win: "Llega a la meta en todos los niveles. Lee con calma: menos ofertas equivocadas = más monedas.",
      tip: "Mira la línea “Wants” de cada tarjeta antes de ofrecer.",
      skill: "cambiar sin dinero y explicar por qué se inventó el dinero",
      learn: "Por qué existe el dinero",
    },
  },
  {
    id: "rush", e: "🛒", time: 2, tone: "gold",
    en: {
      tag: "Colombian money", title: "Money Rush",
      card: "Pay with real Colombian pesos, count your change and decide: spend it now or save it?",
      fact: "Colombian money tells stories: the $500 coin shows a glass frog and the $50,000 banknote honors Gabriel García Márquez. Knowing your money means paying the exact price, checking your change and thinking before you spend.",
      steps: [
        "Tap the coins and bills in your wallet to put the EXACT price of the water on the counter. Then press Pay.",
        "You buy a sandwich with a $5,000 bill: choose the correct change.",
        "Last decision: buy the book now, or save and buy it later?",
      ],
      win: "Complete the three steps. Count before you pay, and think before you spend!",
      tip: "Tap money in your wallet to move it to the counter. Tap it on the counter to take it back.",
      skill: "pay with Colombian pesos and check the change",
      learn: "Paying and getting change",
    },
    es: {
      tag: "Pesos colombianos", title: "Carrera del dinero",
      card: "Paga con pesos colombianos de verdad, calcula tu cambio y decide: ¿gastar ya o ahorrar?",
      fact: "El dinero colombiano cuenta historias: la moneda de $500 tiene una rana de cristal y el billete de $50.000 homenajea a Gabriel García Márquez. Conocer tu dinero es pagar el precio exacto, revisar el cambio y pensar antes de gastar.",
      steps: [
        "Toca las monedas y billetes de tu billetera para poner en el mostrador el precio EXACTO del agua. Luego presiona Pay.",
        "Compras un sándwich con un billete de $5.000: elige el cambio correcto.",
        "Última decisión: ¿compras el libro ya, o ahorras y lo compras después?",
      ],
      win: "Completa los tres pasos. ¡Cuenta antes de pagar y piensa antes de gastar!",
      tip: "Toca el dinero de tu billetera para pasarlo al mostrador. Tócalo en el mostrador para devolverlo.",
      skill: "pagar con pesos colombianos y revisar el cambio",
      learn: "Pagar y recibir cambio",
    },
  },
  {
    id: "mill", e: "💰", time: 5, tone: "coral",
    en: {
      tag: "Quiz show", title: "Who Wants to Be a FinFluent Millionaire?",
      card: "12 questions, 3 lifelines and a billion pesos of play money. How far can you go?",
      fact: "This quiz show uses real questions from the whole FinFluent route: saving, budgets, banks, credit and investing. In class, students also write their own questions, and the best ones go into the game for their classmates.",
      steps: [
        "Press “Let's play!” and answer 12 questions. Each one is worth more play money.",
        "Each question has a timer, so read fast but carefully.",
        "Use your 3 lifelines: 50:50, Ask the class and Switch the question.",
        "Levels 4 and 8 are safe: if you fail later, you keep that money. You can walk away at any time.",
      ],
      win: "Reach level 12 to become a FinFluent Millionaire. When the game ends, press “Save my best”.",
      tip: "Not sure? Use a lifeline, or walk away with your prize.",
      skill: "answer money questions about saving, banks and investing",
      learn: "Money knowledge, 6th to 11th",
    },
    es: {
      tag: "Concurso", title: "¿Quién quiere ser millonario FinFluent?",
      card: "12 preguntas, 3 comodines y mil millones de pesos de juego. ¿Hasta dónde llegas?",
      fact: "Este concurso usa preguntas reales de toda la ruta FinFluent: ahorro, presupuesto, bancos, crédito e inversión. En clase, los estudiantes también escriben sus propias preguntas, y las mejores entran al juego para sus compañeros.",
      steps: [
        "Presiona “Let's play!” y responde 12 preguntas. Cada una vale más dinero de juego.",
        "Cada pregunta tiene tiempo límite: lee rápido, pero con cuidado.",
        "Usa tus 3 comodines: 50:50, preguntar a la clase y cambiar la pregunta.",
        "Los niveles 4 y 8 son seguros: si fallas después, te quedas con ese dinero. Puedes retirarte cuando quieras.",
      ],
      win: "Llega al nivel 12 para ser millonario FinFluent. Al terminar, presiona “Save my best”.",
      tip: "¿No estás seguro? Usa un comodín o retírate con tu premio.",
      skill: "responder preguntas de ahorro, bancos e inversión",
      learn: "Saber financiero de toda la ruta",
    },
  },
  {
    id: "crash", e: "🌪️", time: 4, tone: "ink",
    en: {
      tag: "Investing", title: "Crash Survival",
      card: "$10,000,000 invested and a real market crash, month by month. Do you hold, sell or buy?",
      fact: "Stock markets go up and down. In 2008 and in 2020 they fell more than 30%… and then recovered. Many people who panicked and sold at the bottom lost more than people who stayed calm and waited.",
      steps: [
        "Choose a real crash: the 2008 financial crisis or the COVID crash of 2020.",
        "Before each month, decide: Hold, Sell everything, or Buy back.",
        "The real result of that month is applied to your money. Watch the chart grow or fall.",
        "At the end, compare your result with someone who just held.",
      ],
      win: "Live every month of the crash and try to finish above the “just hold” strategy.",
      tip: "Big falls feel scary. Ask yourself: is this a reason to sell, or to wait?",
      skill: "stay calm in a market crash and think long term",
      learn: "Investing and emotions",
    },
    es: {
      tag: "Inversión", title: "Sobrevive al crash",
      card: "$10.000.000 invertidos y una caída real del mercado, mes a mes. ¿Mantienes, vendes o compras?",
      fact: "Los mercados suben y bajan. En 2008 y en 2020 cayeron más de 30%… y después se recuperaron. Muchas personas que entraron en pánico y vendieron en el peor momento perdieron más que quienes mantuvieron la calma y esperaron.",
      steps: [
        "Elige una crisis real: la crisis financiera de 2008 o el crash del COVID en 2020.",
        "Antes de cada mes decide: mantener (Hold), vender todo (Sell) o volver a comprar (Buy back).",
        "Se aplica el resultado real de ese mes a tu dinero. Mira cómo sube o baja la gráfica.",
        "Al final, compara tu resultado con alguien que solo mantuvo su inversión.",
      ],
      win: "Vive todos los meses de la crisis y trata de terminar por encima de la estrategia de “solo mantener”.",
      tip: "Las caídas grandes asustan. Pregúntate: ¿es razón para vender o para esperar?",
      skill: "mantener la calma en una crisis y pensar a largo plazo",
      learn: "Inversión y emociones",
    },
  },
];

const UI = {
  en: {
    badge: "Free demo · no account needed",
    h1a: "Four missions.", h1b: "One money diploma.",
    lead: "These are real activities from FinFluent, the same ones students play in class. Every mission starts with a short story and clear instructions.",
    note: "Nothing is saved: if you reload, the demo starts again.",
    progress: "Your progress", coins: "coins",
    play: "Start", again: "Play again", min: "min",
    learn: "You learn",
    how: "How the demo works",
    how1: "Pick any mission", how2: "Read the briefing", how3: "Play and earn coins", how4: "Get your diploma",
    waitT: "Your diploma is waiting", waitP: (n) => `Complete ${n} more mission${n === 1 ? "" : "s"} to unlock it.`,
    doneT: "You finished the demo!", doneP: "Write the name for the diploma.",
    namePh: "Name for the diploma", getCert: "Get my diploma",
    back: "All missions", briefing: "Mission briefing",
    fact: "Did you know?", mission: "Your mission", win: "How to win",
    start: "Start the mission", tipT: "Tip", howPlay: "How to play", close: "Close",
    winRush: "Smart shopper!", winRushP: "You paid the exact price, checked your change and thought before spending.", backDemo: "Back to the missions",
    certK: "Certificate of completion", certT: "Money Explorer", certBy: "This certifies that", certCan: "played the FinFluent demo and can now:",
    certNote: "This is only a taste. The full course has 6 grades, 24 periods and a diploma for every year.",
    print: "Print / save as PDF", playAgain: "Play again", want: "I want FinFluent at my school", discover: "Discover the full course",
    stCoins: "coins earned", stMissions: "missions", stLang: "language: English",
    home: "Home", login: "Log in", someone: "A future money expert",
  },
  es: {
    badge: "Demo gratis · sin cuenta",
    h1a: "Cuatro misiones.", h1b: "Un diploma de finanzas.",
    lead: "Son actividades reales de FinFluent, las mismas que juegan los estudiantes en clase. Cada misión empieza con una historia corta e instrucciones claras.",
    note: "No se guarda nada: si recargas, el demo empieza de nuevo.",
    progress: "Tu progreso", coins: "monedas",
    play: "Jugar", again: "Jugar otra vez", min: "min",
    learn: "Aprendes",
    how: "Cómo funciona el demo",
    how1: "Elige cualquier misión", how2: "Lee las instrucciones", how3: "Juega y gana monedas", how4: "Recibe tu diploma",
    waitT: "Tu diploma te espera", waitP: (n) => `Completa ${n} misi${n === 1 ? "ón" : "ones"} más para desbloquearlo.`,
    doneT: "¡Terminaste el demo!", doneP: "Escribe el nombre para el diploma.",
    namePh: "Nombre para el diploma", getCert: "Ver mi diploma",
    back: "Todas las misiones", briefing: "Antes de jugar",
    fact: "¿Sabías que…?", mission: "Tu misión", win: "Cómo se gana",
    start: "Empezar la misión", tipT: "Pista", howPlay: "Cómo se juega", close: "Cerrar",
    winRush: "¡Comprador inteligente!", winRushP: "Pagaste el precio exacto, revisaste el cambio y pensaste antes de gastar.", backDemo: "Volver a las misiones",
    certK: "Certificado de participación", certT: "Money Explorer", certBy: "Se certifica que", certCan: "jugó el demo de FinFluent y ya sabe:",
    certNote: "Esto es solo un abrebocas. El curso completo tiene 6 grados, 24 periodos y un diploma por cada año.",
    print: "Imprimir / guardar PDF", playAgain: "Jugar otra vez", want: "Quiero FinFluent en mi colegio", discover: "Conocer el curso completo",
    stCoins: "monedas ganadas", stMissions: "misiones", stLang: "todo en inglés",
    home: "Inicio", login: "Ingresar", someone: "Un futuro experto en dinero",
  },
};

export const Demo = () => {
  const [lang, setLang] = useState("en");
  const [open, setOpen] = useState(null);      // misión seleccionada
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState({});        // { id: monedas }
  const [name, setName] = useState("");
  const [showCert, setShowCert] = useState(false);
  const [rushWon, setRushWon] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const t = UI[lang];

  useEffect(() => { window.scrollTo({ top: 0 }); }, [open, playing, showCert]);

  const total = Object.values(done).reduce((a, c) => a + c, 0);
  const count = Object.keys(done).length;
  const allDone = count === MISSIONS.length;

  // Los juegos llaman onSave al terminar: aquí solo se cuenta en memoria
  const saveFor = (id) => (payload = {}) => {
    setDone((d) => ({ ...d, [id]: Number(payload.xp) || 20 }));
    return Promise.resolve({ status: "success" });
  };
  const toMap = () => { setOpen(null); setPlaying(false); setRushWon(false); setTipOpen(false); };
  const restart = () => { setDone({}); setName(""); setShowCert(false); toMap(); };

  // Función normal (no componente) para no reiniciar el juego en cada render
  const shell = (children) => (
    <div className="demo">
      <DemoTop t={t} lang={lang} setLang={setLang} />
      {children}
    </div>
  );

  /* ------------------------- briefing + juego ------------------------- */
  if (open) {
    const m = MISSIONS.find((x) => x.id === open);
    const c = m[lang];

    if (!playing) {
      return (
        shell(<>
          <div className="demo-wrap narrow">
            <button type="button" className="demo-back" onClick={toMap}><ArrowLeft size={16} strokeWidth={2.4} /> {t.back}</button>
            <article className={`demo-brief tone-${m.tone}`}>
              <header className="demo-brief-head">
                <em>{m.e}</em>
                <div>
                  <small>{t.briefing} · {c.tag}</small>
                  <h1>{c.title}</h1>
                  <span className="demo-brief-meta"><Clock size={14} /> {m.time} {t.min} · <GraduationCap size={14} /> {t.learn}: {c.learn}</span>
                </div>
              </header>

              <section className="demo-brief-fact">
                <h2><Lightbulb size={18} strokeWidth={2.4} /> {t.fact}</h2>
                <p>{c.fact}</p>
              </section>

              <div className="demo-brief-cols">
                <section className="demo-brief-steps">
                  <h2><Target size={18} strokeWidth={2.4} /> {t.mission}</h2>
                  <ol>{c.steps.map((s, i) => <li key={i}><span>{i + 1}</span><p>{s}</p></li>)}</ol>
                </section>
                <section className="demo-brief-win">
                  <h2><Trophy size={18} strokeWidth={2.4} /> {t.win}</h2>
                  <p>{c.win}</p>
                  <div className="demo-brief-tip"><b>{t.tipT}:</b> {c.tip}</div>
                </section>
              </div>

              <div className="demo-brief-go">
                <button className="demo-start" onClick={() => setPlaying(true)}><Play size={18} strokeWidth={2.6} /> {t.start}</button>
              </div>
            </article>
          </div>
        </>)
      );
    }

    let view = null;
    if (open === "chain") view = <ChainMarket onSave={saveFor("chain")} onExit={toMap} />;
    if (open === "mill") view = <Millionaire demo ctx={{ name: lang === "es" ? "amigo" : "friend" }} onSave={saveFor("mill")} onExit={toMap} />;
    if (open === "crash") view = <CrashSurvival demo onSave={saveFor("crash")} onExit={toMap} />;
    if (open === "rush") {
      view = rushWon ? (
        <div className="demo-win">
          <span>🏅</span>
          <h2>{t.winRush}</h2>
          <p>{t.winRushP}</p>
          <div className="coin-tag big"><Coins size={18} /> +20</div>
          <button className="s1-btn primary big" onClick={toMap}>{t.backDemo} <ChevronRight size={18} /></button>
        </div>
      ) : (
        <RoomRush room={ROOM_RUSH} onExit={toMap} onDone={() => { saveFor("rush")({ xp: 20 }); setRushWon(true); }} />
      );
    }
    return (
      shell(<>
        <div className="demo-wrap">
          <div className="demo-playbar">
            <button type="button" className="demo-back" onClick={toMap}><ArrowLeft size={16} strokeWidth={2.4} /> {t.back}</button>
            <span className="demo-playbar-title"><em>{m.e}</em> {c.title}</span>
            <button type="button" className={`demo-howbtn ${tipOpen ? "on" : ""}`} onClick={() => setTipOpen(!tipOpen)}>
              {tipOpen ? <X size={15} strokeWidth={2.6} /> : <HelpCircle size={15} strokeWidth={2.4} />} {tipOpen ? t.close : t.howPlay}
            </button>
          </div>
          {tipOpen ? (
            <div className="demo-howpanel">
              <ol>{c.steps.map((s, i) => <li key={i}><span>{i + 1}</span>{s}</li>)}</ol>
              <p><Trophy size={15} /> {c.win}</p>
            </div>
          ) : (
            <div className="demo-tipline"><Lightbulb size={15} strokeWidth={2.4} /> <b>{t.tipT}:</b> {c.tip}</div>
          )}
          <div className="demo-stage"><div className={WRAP[open]}>{view}</div></div>
        </div>
      </>)
    );
  }

  /* ---------------------------- diploma ---------------------------- */
  if (showCert) {
    const wa = CONTACT_WHATSAPP
      ? `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent("Hola, vi el demo de FinFluent y quiero información para mi colegio.")}`
      : null;
    return (
      shell(<>
        <div className="demo-wrap narrow">
          <div className="demo-cert">
            <div className="demo-cert-corner tl" /><div className="demo-cert-corner br" />
            <div className="demo-cert-top">
              <span className="demo-cert-mark"><TrendingUp size={20} strokeWidth={2.6} /></span>
              <span>Fin<b>Fluent</b></span>
            </div>
            <small className="demo-cert-kicker">{t.certK}</small>
            <h1>{t.certT}</h1>
            <p className="demo-cert-lead">{t.certBy}</p>
            <h2>{name.trim() || t.someone}</h2>
            <p className="demo-cert-lead">{t.certCan}</p>
            <ul>
              {MISSIONS.map((m) => <li key={m.id}><span>{m.e}</span>{m[lang].skill}</li>)}
            </ul>
            <div className="demo-cert-foot">
              <div><b>{total}</b><span>{t.stCoins}</span></div>
              <div><b>4</b><span>{t.stMissions}</span></div>
              <div><b>EN</b><span>{t.stLang}</span></div>
            </div>
            <p className="demo-cert-note">{t.certNote}</p>
          </div>

          <div className="demo-cert-actions">
            <button className="s1-btn ghost" onClick={() => window.print()}><Printer size={17} /> {t.print}</button>
            <button className="s1-btn ghost" onClick={restart}><RotateCcw size={17} /> {t.playAgain}</button>
            {wa ? (
              <a className="s1-btn primary" href={wa} target="_blank" rel="noreferrer"><School size={17} /> {t.want}</a>
            ) : (
              <Link className="s1-btn primary" to="/"><School size={17} /> {t.discover}</Link>
            )}
          </div>
        </div>
      </>)
    );
  }

  /* ------------------------- mapa del demo ------------------------- */
  return (
    shell(<>
      <div className="demo-wrap">
        <header className="demo-hero">
          <div className="demo-hero-copy">
            <span className="demo-badge"><Sparkles size={14} strokeWidth={2.4} /> {t.badge}</span>
            <h1>{t.h1a}<br /><span>{t.h1b}</span></h1>
            <p>{t.lead}</p>
            <small>{t.note}</small>
          </div>
          <div className="demo-score">
            <small>{t.progress}</small>
            <div className="demo-score-dots">
              {MISSIONS.map((m) => <i key={m.id} className={done[m.id] !== undefined ? "on" : ""}>{done[m.id] !== undefined ? <Check size={14} strokeWidth={3.2} /> : m.e}</i>)}
            </div>
            <b>{count}<i>/4</i></b>
            <span><Coins size={15} /> {total} {t.coins}</span>
          </div>
        </header>

        <ol className="demo-how" aria-label={t.how}>
          {[t.how1, t.how2, t.how3, t.how4].map((s, i) => <li key={i}><span>{i + 1}</span>{s}</li>)}
        </ol>

        <section className="demo-grid">
          {MISSIONS.map((m) => {
            const c = m[lang];
            const ok = done[m.id] !== undefined;
            return (
              <article key={m.id} className={`demo-card tone-${m.tone} ${ok ? "ok" : ""}`}>
                <div className="demo-card-art">
                  <em>{m.e}</em>
                  <span className="demo-tag">{c.tag}</span>
                  {ok && <span className="demo-done"><Check size={14} strokeWidth={3.2} /> +{done[m.id]}</span>}
                </div>
                <div className="demo-card-body">
                  <h3>{c.title}</h3>
                  <p>{c.card}</p>
                  <div className="demo-card-meta">
                    <span><Clock size={13} /> {m.time} {t.min}</span>
                    <span><GraduationCap size={13} /> {c.learn}</span>
                  </div>
                  <button className={`demo-play ${ok ? "ghost" : ""}`} onClick={() => setOpen(m.id)}>
                    {ok ? <><RotateCcw size={15} /> {t.again}</> : <><Play size={15} strokeWidth={2.6} /> {t.play}</>}
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <section className={`demo-finish ${allDone ? "on" : ""}`}>
          <span className="demo-finish-ico">{allDone ? <Award size={26} strokeWidth={2.2} /> : <Lock size={22} strokeWidth={2.4} />}</span>
          <div className="demo-finish-copy">
            <h3>{allDone ? t.doneT : t.waitT}</h3>
            <p>{allDone ? t.doneP : t.waitP(4 - count)}</p>
          </div>
          {allDone && (
            <div className="demo-finish-form">
              <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder={t.namePh} />
              <button className="s1-btn primary" onClick={() => setShowCert(true)}>{t.getCert} <ChevronRight size={17} /></button>
            </div>
          )}
        </section>
      </div>
    </>)
  );
};

function DemoTop({ t, lang, setLang }) {
  return (
    <nav className="demo-top">
      <Link to="/" className="demo-logo">
        <span className="demo-logo-mark"><TrendingUp size={17} strokeWidth={2.6} /></span>
        <span>Fin<b>Fluent</b></span>
        <em>Demo</em>
      </Link>
      <div className="demo-top-actions">
        <div className="demo-lang" role="tablist" aria-label="Language">
          <button role="tab" aria-selected={lang === "en"} className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
          <button role="tab" aria-selected={lang === "es"} className={lang === "es" ? "on" : ""} onClick={() => setLang("es")}>ES</button>
        </div>
        <Link to="/" className="demo-link"><ArrowLeft size={15} /> {t.home}</Link>
        <Link to="/?login=1" className="demo-login">{t.login}</Link>
      </div>
    </nav>
  );
}
