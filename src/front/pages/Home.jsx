import React, { useState, useEffect } from "react";
import "../Styles/home.css";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, Target, BookOpen, PlayCircle, PenLine, Brain, Lightbulb, Headphones, Mic,
  Coins, Flame, Zap, Check, ArrowRight, ArrowUpRight, Rocket, Award, Gamepad2, Repeat2,
  Store, Handshake, Swords, ClipboardCheck, Languages, GraduationCap, ShieldCheck, Users, 
} from "lucide-react";
import { apiRetry, getSession, setSession } from "../api";
import { COURSES, GRADES, ordinal } from "../courses";

/* ---------- Marca ---------- */
const Logo = ({ dark }) => (
  <div className={`ff-logo ${dark ? "on-dark" : ""}`}>
    <span className="ff-mark"><TrendingUp size={18} strokeWidth={2.6} /></span>
    <span className="ff-word">Fin<b>Fluent</b></span>
  </div>
);

/* ---------- Ticker: vocabulario que un estudiante domina de 6° a 11° ---------- */
const TICKER = [
  "Barter", "Budget", "Saving goal", "Inflation", "Interest rate", "Opportunity cost",
  "Credit score", "Break-even", "Compound interest", "ETF", "Valuation", "Cash flow",
];

/* ---------- Lo que hace distinto a FinFluent ---------- */
const PILLARS = [
  { Icon: Languages, title: "Finance in English (CLIL)", text: "Students don't study English and then finance. They learn how money works through English, so both grow in the same class." },
  { Icon: Rocket, title: "One route from 6th to 11th", text: "Six grades, four periods each. Every year adds something new and reviews the last one, so nothing is repeated and nothing is lost." },
  { Icon: Gamepad2, title: "It plays like a game", text: "Markets, shops with PIN payments, investor fairs and a Shark Tank. Classmates trade, buy and invest with each other, live." },
];

/* ---------- Una clase: 45 minutos, mismo ritmo ---------- */
const FLOW = [
  { n: 1, Icon: Target, title: "Mission", text: "The goal of the class and a quick recap of what came before." },
  { n: 2, Icon: BookOpen, title: "Read or watch", text: "A short text, a video or a listening recorded for the level." },
  { n: 3, Icon: PenLine, title: "Do it", text: "Budgets, calculators, plans and simulators with real numbers." },
  { n: 4, Icon: Gamepad2, title: "Play it", text: "A game or challenge. Questions are shuffled for every student." },
  { n: 5, Icon: Brain, title: "Check", text: "A quiz with instant feedback and coins for every right answer." },
  { n: 6, Icon: Lightbulb, title: "What I learned", text: "A written reflection that connects the class to real life." },
];

const SKILLS = [
  { letter: "R", Icon: BookOpen, title: "Reading", text: "Finance texts written for each grade's level, from A2 in 6th grade." },
  { letter: "L", Icon: Headphones, title: "Listening", text: "Videos and recorded audios that explain money ideas in clear English." },
  { letter: "S", Icon: Mic, title: "Speaking", text: "Pitches, negotiations and presentations in front of the class." },
  { letter: "W", Icon: PenLine, title: "Writing", text: "Plans, reviews and reflections using the new vocabulary." },
];

/* ---------- Los juegos donde la clase juega junta ---------- */
const GAMES = [
  { Icon: Repeat2, title: "The barter market", text: "Open a mystery box and trade up with classmates using live codes." },
  { Icon: Store, title: "Shops and digital wallets", text: "Sellers open a shop, buyers pay by card, QR or wallet with a secret PIN." },
  { Icon: Handshake, title: "Investor fairs", text: "Publish your company, then invest your coins in the ideas you believe in." },
  { Icon: Swords, title: "Shark Tank and game zone", text: "Value a company, face the sharks and battle friends with finance questions." },
];

const REWARDS = [
  { Icon: Coins, title: "Coins and XP", text: "Every activity pays. Quizzes, readings and reflections add up." },
  { Icon: Zap, title: "Levels", text: "Every 100 XP is a new level on the student's profile." },
  { Icon: Flame, title: "Streaks", text: "Coming back day after day keeps the streak alive." },
  { Icon: Rocket, title: "The rocket", text: "It flies one stop each time a period is completed." },
];

const FOR_SCHOOLS = [
  { title: "Six grades, already built", text: "Classes, readings, videos, recorded audios, games and projects from 6th to 11th." },
  { title: "Create a whole grade in a minute", text: "Paste the list of names, usernames and passwords. Seats per grade are set for your school." },
  { title: "Follow every student", text: "Progress by period, quiz scores, the questions they missed and every written answer." },
  { title: "Grades and diplomas", text: "Export grades to a spreadsheet. Diplomas carry your school's name, crest and signature." },
];
const FOR_STUDENTS = [
  { title: "You build things that are yours", text: "A budget, a company, a store, an investment plan." },
  { title: "You talk about money in English", text: "Pitches, negotiations and reviews, with real confidence." },
  { title: "Your work is never lost", text: "Reload the page and you are back in the same activity, with your text still there." },
  { title: "It's a game, but the wins are real", text: "Coins, levels, streaks and a rocket that flies with every period." },
];

const OUTCOMES = [
  { Icon: ClipboardCheck, title: "Every answer is saved", text: "Work is stored the moment it is done and kept on the device if the wifi drops, then uploaded on its own." },
  { Icon: ShieldCheck, title: "Teachers see everything", text: "Progress by grade and by student: what they answered, their scores and the exact questions they missed." },
  { Icon: Award, title: "A diploma that says what they can do", text: "Finishing the four periods unlocks a diploma with the school's name and the skills the student now has." },
];

export const Home = ({ onLoginSuccess }) => {
  const [view, setView] = useState("landing");
  const [credentials, setCredentials] = useState({ user_key: "", pass: "" });
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");
  const [activeGrade, setActiveGrade] = useState("6");
  const navigate = useNavigate();

  // Si ya hay sesión, directo al dashboard. Si venció, abrimos el login con el aviso.
  useEffect(() => {
    if (getSession()?.token) { navigate("/dashboard", { replace: true }); return; }
    if (new URLSearchParams(window.location.search).get("expired")) {
      setView("login");
      setError("Your session expired. Log in again to continue where you left off.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [navigate]);

  useEffect(() => { window.scrollTo(0, 0); }, [view]);

  const handleInputChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSlow(false);
    const slowTimer = setTimeout(() => setSlow(true), 4000);
    try {
      const result = await apiRetry("/auth/login", {
        method: "POST",
        body: { user_key: credentials.user_key.trim(), password: credentials.pass },
      });
      if (result.status === "success" && result.token) {
        setSession(result);
        if (onLoginSuccess) onLoginSuccess(result);
        navigate("/dashboard");
      } else {
        setError(result.message || "Wrong username or password.");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError("Couldn't reach the server. Check your internet and try again.");
    } finally {
      clearTimeout(slowTimer);
      setSlow(false);
      setLoading(false);
    }
  };

  const course = COURSES[activeGrade];

  /* =============================== LOGIN =============================== */
  if (view === "login") {
    return (
      <div className="fin-login-screen">
        <aside className="login-visual">
          <Logo dark />
          <div className="lv-copy">
            <h2>Money skills,<br />in English,<br />grade by grade.</h2>
            <p>Log in with the username and password your teacher gave you. Your course and your progress are waiting.</p>
            <div className="lv-chips">
              <span><GraduationCap size={13} strokeWidth={2.4} /> Grades 6 to 11</span>
              <span><Languages size={13} strokeWidth={2.4} /> CLIL</span>
              <span><Mic size={13} strokeWidth={2.4} /> 4 skills</span>
            </div>
          </div>
          <div className="lv-foot">FinFluent · Financial education in English</div>
        </aside>

        <div className="login-panel">
          <div className="login-box">
            <button className="btn-back-home" onClick={() => setView("landing")}>← Back home</button>
            <h1>Welcome back</h1>
            <p className="login-sub">Sign in to open your course.</p>
            <form onSubmit={handleSubmit}>
              <div className="fin-field">
                <label htmlFor="ff-user">Username</label>
                <input id="ff-user" type="text" name="user_key" placeholder="e.g. ana.paz"
                  autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username"
                  value={credentials.user_key} onChange={handleInputChange} required />
              </div>
              <div className="fin-field">
                <label htmlFor="ff-pass">Password</label>
                <input id="ff-pass" type="password" name="pass" placeholder="••••••••" autoComplete="current-password"
                  value={credentials.pass} onChange={handleInputChange} required />
              </div>
              {error && <div className="login-error" role="alert">{error}</div>}
              {slow && !error && <div className="login-wait">Waking up the server. This can take a few seconds the first time…</div>}
              <button type="submit" className="btn-login-submit" disabled={loading}>
                {loading ? "Signing in…" : "Start learning"}
              </button>
            </form>
            <p className="login-help">Forgot your password? Ask your teacher to reset it.</p>
          </div>
        </div>
      </div>
    );
  }

  /* =============================== LANDING =============================== */
  return (
    <div className="fin-home">
      <nav className="fin-nav">
        <Logo />
        <div className="fin-nav-links">
          <a href="#what">What it is</a>
          <a href="#route">Grades 6 to 11</a>
          <a href="#method">Method</a>
          <a href="#games">Games</a>
          <a href="#schools">For schools</a>
        </div>
        <button className="btn-login-nav" onClick={() => setView("login")}>Log in</button>
      </nav>

      {/* HERO */}
      <section className="blk blk-ink">
        <div className="blk-inner hero-inner">
          <div className="hero-copy">
            <span className="hero-badge"><span className="dot"></span> Financial education in English · Grades 6 to 11</span>
            <h1>Six school years to become <span className="hl">fluent in money</span>.</h1>
            <p className="hero-lead">
              FinFluent is the finance class students ask for: real money skills, taught in English,
              through games, markets and projects. One clear route from 6th grade to graduation.
            </p>
            <div className="hero-cta-row">
              <button className="btn-primary" onClick={() => setView("login")}>Log in to my course</button>
              <a href="#route" className="btn-ghost">See the six grades <ArrowRight size={16} strokeWidth={2.4} /></a>
            </div>
          </div>

          <div className="hero-hud">
            <div className="hud-top">
              <span className="hud-tag">Grade 6 · Money Explorers</span>
              <span className="hud-tag hud-tag-gold"><Coins size={13} strokeWidth={2.6} /> 480 XP</span>
            </div>
            <h3>Your year, period by period</h3>
            <div className="hud-bar"><i style={{ width: "50%" }} /></div>
            <div className="hud-bar-label"><span>Year progress</span><span>50%</span></div>
            <ul className="hud-tasks">
              <li className="done"><Check size={13} strokeWidth={3} /> Period 1 · From Barter to Money</li>
              <li className="done"><Check size={13} strokeWidth={3} /> Period 2 · My First Financial Plan</li>
              <li>Period 3 · Young Entrepreneurs Lab</li>
              <li>Period 4 · My Company Goes Global</li>
            </ul>
            <div className="hud-foot"><Rocket size={14} strokeWidth={2.4} /> The rocket moves each time a period is done</div>
          </div>
        </div>

        <div className="ticker" role="presentation">
          <div className="ticker-track">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i}>{t}<i /></span>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT IT IS */}
      <section className="blk blk-paper" id="what">
        <div className="blk-inner reality-inner">
          <div className="reality-head">
            <span className="sec-eyebrow">What is FinFluent</span>
            <h2>The subject school forgets, in the language the world uses</h2>
            <p className="sec-lead">
              Everyone uses money every day, yet almost no one is taught how it works. FinFluent turns
              financial education into a complete school program: 24 periods of classes, from the first
              barter in 6th grade to valuing a company in 11th, all of it in English.
            </p>
            <div className="fact-row">
              <span><b>6</b> grades</span>
              <span><b>24</b> periods</span>
              <span><b>4</b> language skills</span>
              <span><b>1</b> diploma per year</span>
            </div>
          </div>
          <div className="reality-list">
            {PILLARS.map((r) => (
              <div className="reality-row" key={r.title}>
                <span className="reality-ico"><r.Icon size={20} strokeWidth={2.2} /></span>
                <div>
                  <h3>{r.title}</h3>
                  <p>{r.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE ROUTE — un grado a la vez */}
      <section className="blk blk-ink2" id="route">
        <div className="blk-inner">
          <div className="sec-head">
            <div>
              <span className="sec-eyebrow eyebrow-on-dark">The route · Grades 6 to 11</span>
              <h2 className="on-dark">Every grade is a new adventure</h2>
            </div>
            <p className="sec-lead on-dark-lead">
              Each student sees only the course of their own grade: four periods, one big project each,
              and a quick recap of the year before. Pick a grade to look inside.
            </p>
          </div>

          <div className="level-select">
            <div className="level-rail" role="tablist" aria-label="Grades">
              {GRADES.map((g) => (
                <button
                  key={g}
                  role="tab"
                  className={`level-node ${activeGrade === g ? "active" : ""} ${Number(g) < Number(activeGrade) ? "past" : ""}`}
                  onClick={() => setActiveGrade(g)}
                  aria-selected={activeGrade === g}
                >
                  <span className="level-node-ico grade-num">{g}</span>
                  <span className="level-node-label">{COURSES[g].name}</span>
                </button>
              ))}
            </div>

            <div className="level-panel" key={activeGrade}>
              <div className="level-panel-top">
                <div>
                  <span className="level-panel-tag">{ordinal(activeGrade)} grade{course.level ? ` · English level ${course.level}` : ""} · 4 periods</span>
                  <div className="level-panel-head">
                    <span className="level-panel-ico grade-num">{activeGrade}</span>
                    <div>
                      <h3>{course.name}</h3>
                      <p>{course.tagline}</p>
                    </div>
                  </div>
                </div>
              </div>

              <ol className="period-list">
                {course.periods.map((p) => (
                  <li key={p.key}>
                    <span className="period-ico"><p.Icon size={18} strokeWidth={2.2} /></span>
                    <div>
                      <small>Period {p.n}</small>
                      <b>{p.title}</b>
                      <em>{p.question}</em>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="level-can">
                <span className="level-panel-step"><ArrowUpRight size={15} strokeWidth={2.4} /> At the end of the year, the student can:</span>
                <ul className="can-list">
                  {course.canDo.map((c) => <li key={c}><Check size={14} strokeWidth={3} /> {c}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW A CLASS FLOWS */}
      <section className="blk blk-paper">
        <div className="blk-inner">
          <div className="sec-head">
            <div>
              <span className="sec-eyebrow">How a class flows</span>
              <h2>One class, one clear win</h2>
            </div>
            <p className="sec-lead">Each class fits in a school hour, with four or five short activities. Students always know what to do, how to do it and how it is graded.</p>
          </div>
          <ol className="flow-row">
            {FLOW.map((f) => (
              <li className="flow-step" key={f.n}>
                <div className="fs-top">
                  <span className="fs-ico"><f.Icon size={18} strokeWidth={2.2} /></span>
                  <span className="fs-n">0{f.n}</span>
                </div>
                <h4>{f.title}</h4>
                <p>{f.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* METHOD · CLIL */}
      <section className="blk blk-paper2" id="method">
        <div className="blk-inner method-inner">
          <div className="method-copy">
            <span className="clil-badge">Our method: CLIL</span>
            <h2>Finance and English, learned together</h2>
            <p>
              We use <strong>CLIL (Content and Language Integrated Learning)</strong>: students
              learn real financial content <em>through</em> English. The platform is English only,
              so every instruction, reading and game is language practice with a purpose.
            </p>
            <p>
              Every period trains all <strong>four skills</strong>, and the level climbs with the
              student, year after year.
            </p>
            <div className="level-ladder">
              <span><b>6th</b> A2</span>
              <span><b>7th</b> A2+</span>
              <span><b>8th</b> B1</span>
              <span><b>9th–11th</b> Business English</span>
            </div>
          </div>
          <div className="skills-row">
            {SKILLS.map((s) => (
              <div className="skill-card" data-letter={s.letter} key={s.title}>
                <span className="skill-ico"><s.Icon size={17} strokeWidth={2.2} /></span>
                <h4>{s.title}</h4>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GAMES + REWARDS */}
      <section className="blk blk-ink" id="games">
        <div className="blk-inner">
          <div className="sec-head">
            <div>
              <span className="sec-eyebrow eyebrow-on-dark">The fun part</span>
              <h2 className="on-dark">The whole class plays in the same economy</h2>
            </div>
            <p className="sec-lead on-dark-lead">
              These are not worksheets on a screen. Students trade, sell, pay and invest with each other in real time,
              and every school plays in its own private economy.
            </p>
          </div>

          <div className="coins-strip">
            {GAMES.map((c) => (
              <div className="coin-item" key={c.title}>
                <span className="coin-ico"><c.Icon size={19} strokeWidth={2.2} /></span>
                <h4>{c.title}</h4>
                <p>{c.text}</p>
              </div>
            ))}
          </div>

          <div className="reward-band">
            <div className="xp-showcase">
              <div className="xp-showcase-top">
                <span>Level 4</span>
                <span>320 / 500 XP</span>
              </div>
              <div className="xp-showcase-bar"><i style={{ width: "64%" }} /></div>
              <small>Grades come from behavior, quizzes and the "What I learned" reflections.</small>
            </div>
            <div className="reward-row">
              {REWARDS.map((r) => (
                <span key={r.title}><r.Icon size={18} strokeWidth={2.3} /><span><b>{r.title}</b>{r.text}</span></span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FOR SCHOOLS / STUDENTS */}
      <section className="blk blk-paper2" id="schools">
        <div className="blk-inner">
          <div className="sec-head">
            <div>
              <span className="sec-eyebrow">For schools and students</span>
              <h2>Ready to run on day one</h2>
            </div>
            <p className="sec-lead">
              The school gets its own space with seats per grade and an admin panel. Students get a course
              that feels like a game and remembers everything they do.
            </p>
          </div>
          <div className="aud-grid">
            <article className="aud-card schools">
              <span className="aud-tag"><Users size={14} strokeWidth={2.4} /> For schools</span>
              <h3>A full program, ready to run</h3>
              <ul className="aud-list">
                {FOR_SCHOOLS.map((x) => (
                  <li key={x.title}><span className="tick"><Check size={14} strokeWidth={3} /></span><span><b>{x.title}</b>{x.text}</span></li>
                ))}
              </ul>
            </article>
            <article className="aud-card students">
              <span className="aud-tag"><GraduationCap size={14} strokeWidth={2.4} /> For students</span>
              <h3>Why you'll want to finish</h3>
              <ul className="aud-list">
                {FOR_STUDENTS.map((x) => (
                  <li key={x.title}><span className="tick"><Check size={14} strokeWidth={3} /></span><span><b>{x.title}</b>{x.text}</span></li>
                ))}
              </ul>
              <div className="aud-foot">
                <button className="btn-ink" onClick={() => setView("login")}>Log in to my course</button>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* TRACEABILITY */}
      <section className="blk blk-paper">
        <div className="blk-inner">
          <div className="sec-head">
            <div>
              <span className="sec-eyebrow">Learning you can trace</span>
              <h2>Nothing gets lost, everything can be shown</h2>
            </div>
            <p className="sec-lead">From the first answer in 6th grade to the diploma in 11th, every step is saved and visible to the teacher.</p>
          </div>
          <div className="goal-row">
            {OUTCOMES.map((g) => (
              <div className="goal-col" key={g.title}>
                <span className="goal-ico"><g.Icon size={22} strokeWidth={2.1} /></span>
                <h3>{g.title}</h3>
                <p>{g.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="blk blk-ink">
        <div className="blk-inner cta-inner">
          <div>
            <h2>Ready for your next period?</h2>
            <p>Log in with your username, open your grade and pick up exactly where you left off.</p>
          </div>
          <button className="btn-primary" onClick={() => setView("login")}>Log in</button>
        </div>
      </section>

      <footer className="fin-footer">
        <div className="fin-footer-inner">
          <Logo dark />
          <span>Financial education in English · Grades 6 to 11</span>
        </div>
      </footer>
    </div>
  );
};
