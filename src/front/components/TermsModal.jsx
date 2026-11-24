import React, { useEffect, useRef, useState } from "react";
import { ShieldCheck, BookOpen, MonitorPlay, Sparkles, Users, Scale, Check, LogOut, AlertTriangle } from "lucide-react";
import { apiOk } from "../api";

/* =====================================================================
   TÉRMINOS Y TRATAMIENTO DE DATOS
   Aparece apenas el usuario entra (estudiante o admin de colegio) y no
   deja usar la plataforma hasta aceptar. Se guarda en la tabla users
   (terms_accepted_at + terms_version).

   ⚠️ Si cambias este texto, sube TERMS_VERSION en src/api/routes.py
      para que todos lo acepten de nuevo.
   ===================================================================== */

const COPY = {
  en: {
    tab: "English",
    title: "Before you start",
    lead: "Please read how FinFluent works with your information and where the course content comes from.",
    sections: [
      {
        Icon: Users,
        title: "What we save",
        body: (school) => (
          <>
            <p>To follow your learning, FinFluent saves your <b>full name</b>, your <b>username</b>, your <b>answers</b>, what you <b>write</b>, your <b>scores</b> and the <b>dates</b> you work and log in.</p>
            <p><b>{school}</b> (your teachers and coordinators) can see all of this to follow your progress and grade your work. The FinFluent team can see it only to run and support the platform.</p>
            <p>In class games (markets, shops, fairs and rankings) your classmates can see your first name and your game results. Your information is never sold and never made public.</p>
          </>
        ),
      },
      {
        Icon: BookOpen,
        title: "Where the course comes from",
        body: () => (
          <>
            <p>Every grade follows an established <b>curriculum</b> for financial education in English, organized in four periods per year.</p>
            <p className="tm-inline"><Sparkles size={15} strokeWidth={2.3} /> Readings, questions and activities were written by the FinFluent team <b>with the support of artificial intelligence</b>, and reviewed by teachers.</p>
          </>
        ),
      },
      {
        Icon: MonitorPlay,
        title: "Credit to video creators",
        body: () => (
          <>
            <p>Some classes include <b>YouTube videos</b> made by other people. They are shown with YouTube's official player, they still belong to their creators, and they are used only for education. We thank and give full credit to every creator.</p>
            <p>The questions after each video were made by FinFluent to check your understanding. If a creator asks us to remove a video, we will do it.</p>
          </>
        ),
      },
      {
        Icon: Scale,
        title: "Your rights and your part",
        body: () => (
          <>
            <p>You, your parents or your guardians can ask the school to see, correct or delete your information (Colombian personal data law, Ley 1581 de 2012).</p>
            <p>Your part: do your own work, keep your password secret and use the platform in English.</p>
          </>
        ),
      },
    ],
    check1: (school) => <>I accept that FinFluent saves my name and my answers, and that <b>{school}</b> can see them to follow my learning.</>,
    check2: "I understand where the content comes from: a curriculum, readings made with AI support, and YouTube videos credited to their creators.",
    accept: "Accept and continue",
    saving: "Saving…",
    logout: "Log out",
    scroll: "Scroll to read everything",
  },
  es: {
    tab: "Español",
    title: "Antes de empezar",
    lead: "Lee cómo FinFluent usa tu información y de dónde sale el contenido del curso.",
    sections: [
      {
        Icon: Users,
        title: "Qué guardamos",
        body: (school) => (
          <>
            <p>Para hacer seguimiento a tu aprendizaje, FinFluent guarda tu <b>nombre completo</b>, tu <b>usuario</b>, tus <b>respuestas</b>, lo que <b>escribes</b>, tus <b>notas</b> y las <b>fechas</b> en que trabajas y entras.</p>
            <p><b>{school}</b> (tus profesores y coordinadores) puede ver toda esta información para seguir tu avance y calificar tu trabajo. El equipo de FinFluent la ve solo para operar y dar soporte a la plataforma.</p>
            <p>En los juegos de clase (mercados, tiendas, ferias y rankings) tus compañeros pueden ver tu primer nombre y tus resultados del juego. Tu información nunca se vende ni se hace pública.</p>
          </>
        ),
      },
      {
        Icon: BookOpen,
        title: "De dónde sale el curso",
        body: () => (
          <>
            <p>Cada grado sigue una <b>malla curricular</b> establecida de educación financiera en inglés, organizada en cuatro periodos por año.</p>
            <p className="tm-inline"><Sparkles size={15} strokeWidth={2.3} /> Las lecturas, preguntas y actividades fueron escritas por el equipo de FinFluent <b>con apoyo de inteligencia artificial</b> y revisadas por docentes.</p>
          </>
        ),
      },
      {
        Icon: MonitorPlay,
        title: "Crédito a los creadores de videos",
        body: () => (
          <>
            <p>Algunas clases incluyen <b>videos de YouTube</b> hechos por otras personas. Se muestran con el reproductor oficial de YouTube, siguen siendo de sus creadores y se usan solo con fines educativos. Agradecemos y damos todo el crédito a cada creador.</p>
            <p>Las preguntas después de cada video las hizo FinFluent para comprobar tu comprensión. Si un creador nos pide retirar un video, lo haremos.</p>
          </>
        ),
      },
      {
        Icon: Scale,
        title: "Tus derechos y tu parte",
        body: () => (
          <>
            <p>Tú, tus padres o acudientes pueden pedirle al colegio conocer, corregir o eliminar tu información (Ley 1581 de 2012 de protección de datos personales).</p>
            <p>Tu parte: hacer tu propio trabajo, no compartir tu clave y usar la plataforma en inglés.</p>
          </>
        ),
      },
    ],
    check1: (school) => <>Acepto que FinFluent guarde mi nombre y mis respuestas, y que <b>{school}</b> pueda verlos para hacer seguimiento a mi aprendizaje.</>,
    check2: "Entiendo de dónde sale el contenido: una malla curricular, lecturas hechas con apoyo de IA y videos de YouTube con crédito a sus creadores.",
    accept: "Aceptar y continuar",
    saving: "Guardando…",
    logout: "Cerrar sesión",
    scroll: "Baja para leer todo",
  },
};

export function TermsModal({ version, schoolName, onAccepted, onLogout }) {
  const [lang, setLang] = useState("en");
  const [data, setData] = useState(false);
  const [content, setContent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [atEnd, setAtEnd] = useState(false);
  const bodyRef = useRef(null);
  const t = COPY[lang];
  const school = schoolName || "Your school";

  // Bloquea el scroll de la página de fondo mientras la ventana está abierta
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const onScroll = () => {
    const el = bodyRef.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setAtEnd(true);
  };
  useEffect(() => { onScroll(); }, [lang]);

  const accept = async () => {
    setBusy(true); setError("");
    try {
      const res = await apiOk("/auth/accept-terms", { method: "POST", body: { version, data: true, content: true } });
      onAccepted(res);
    } catch (e) {
      setError(e.message || "Couldn't save. Check your internet and try again.");
    } finally { setBusy(false); }
  };

  return (
    <div className="tm-overlay" role="dialog" aria-modal="true" aria-labelledby="tm-title">
      <div className="tm-card">
        <header className="tm-head">
          <span className="tm-badge"><ShieldCheck size={22} strokeWidth={2.2} /></span>
          <div className="tm-head-copy">
            <h2 id="tm-title">{t.title}</h2>
            <p>{t.lead}</p>
          </div>
          <div className="tm-lang" role="tablist" aria-label="Language">
            {Object.entries(COPY).map(([k, v]) => (
              <button key={k} role="tab" aria-selected={lang === k} className={lang === k ? "on" : ""} onClick={() => setLang(k)}>{v.tab}</button>
            ))}
          </div>
        </header>

        <div className="tm-body" ref={bodyRef} onScroll={onScroll}>
          {t.sections.map((s) => (
            <section key={s.title} className="tm-sec">
              <h3><span><s.Icon size={17} strokeWidth={2.3} /></span>{s.title}</h3>
              {s.body(school)}
            </section>
          ))}
        </div>
        {!atEnd && <div className="tm-more">{t.scroll} ↓</div>}

        <footer className="tm-foot">
          <label className={`tm-check ${data ? "on" : ""}`}>
            <input type="checkbox" checked={data} onChange={(e) => setData(e.target.checked)} />
            <span className="tm-box">{data && <Check size={14} strokeWidth={3.2} />}</span>
            <span>{t.check1(school)}</span>
          </label>
          <label className={`tm-check ${content ? "on" : ""}`}>
            <input type="checkbox" checked={content} onChange={(e) => setContent(e.target.checked)} />
            <span className="tm-box">{content && <Check size={14} strokeWidth={3.2} />}</span>
            <span>{t.check2}</span>
          </label>

          {error && <div className="tm-error"><AlertTriangle size={16} strokeWidth={2.4} /> {error}</div>}

          <div className="tm-actions">
            <button className="tm-logout" onClick={onLogout}><LogOut size={16} strokeWidth={2.3} /> {t.logout}</button>
            <button className="tm-accept" disabled={!data || !content || busy} onClick={accept}>
              {busy ? t.saving : t.accept}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
