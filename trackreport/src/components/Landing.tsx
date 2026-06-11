// Landing page for TrackReport (before sign-in).
// Concept: job hunting as a "line" that you follow
// from stop to stop, from CV submission to hiring.

type LandingProps = {
  onCreate: () => void // opens the sign-up
  onSignIn: () => void // opens the sign-in
}

const STOPS = [
  { label: 'CV sent', sub: 'March 12', state: 'done' },
  { label: 'Waiting', sub: '', state: 'done' },
  { label: 'First contact', sub: 'March 19', state: 'done' },
  { label: 'Prequalification', sub: '', state: 'done' },
  { label: 'Interview', sub: 'today', state: 'current' },
  { label: 'Hired', sub: 'goal', state: 'goal' },
] as const

const FEATURES = [
  {
    title: 'Application tracking',
    text: "Every job, its status, and dated history. You always know where you stand.",
  },
  {
    title: 'Interview questions',
    text: "Note the questions asked and your answers. Your collection grows with each interview.",
  },
  {
    title: 'Companies & contacts',
    text: "Who you met and at which company. Everything is stored in the right place.",
  },
  {
    title: 'Profile',
    text: 'Your information ready to go, the same across all your screens.',
  },
]

export default function Landing({ onCreate, onSignIn }: LandingProps) {
  return (
    <div className="tr-root">
      <style>{CSS}</style>

      {/* ---------- Barre de navigation ---------- */}
      <header className="tr-nav">
        <div className="tr-brand">
          <svg width="30" height="14" viewBox="0 0 30 14" aria-hidden="true">
            <line x1="3" y1="7" x2="27" y2="7" stroke="var(--brand)" strokeWidth="2" />
            <circle cx="3" cy="7" r="3.5" fill="var(--brand)" />
            <circle cx="15" cy="7" r="3.5" fill="var(--paper)" stroke="var(--brand)" strokeWidth="2" />
            <circle cx="27" cy="7" r="3.5" fill="var(--goal)" />
          </svg>
          <span>TrackReport</span>
        </div>
        <button className="tr-nav-link" onClick={onSignIn}>
          Sign in
        </button>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="tr-hero">
        <div className="tr-hero-text">
          <p className="tr-eyebrow">Application tracking</p>
          <h1 className="tr-h1">
            Track every application until it lands.
          </h1>
          <p className="tr-lead">
            Where do you stand with Acme? And the other twelve? TrackReport puts
            all your applications on a single line — from sending the CV
            to getting hired.
          </p>
          <div className="tr-cta">
            <button className="tr-btn-primary" onClick={onCreate}>
              Create account
            </button>
            <button className="tr-btn-ghost" onClick={onSignIn}>
              I already have an account
            </button>
          </div>
        </div>

        {/* Signature: an application moving along its line */}
        <div className="tr-track-card" aria-hidden="true">
          <div className="tr-track-head">
            <span className="tr-tag">Application 04 / 13</span>
            <h3 className="tr-track-title">Front-End Developer</h3>
            <p className="tr-track-meta">Acme Studio · Paris</p>
          </div>
          <ol className="tr-line">
            {STOPS.map((s, i) => (
              <li
                key={s.label}
                className={`tr-stop tr-${s.state}`}
                style={{ ['--i' as string]: i }}
              >
                <span className="tr-dot" />
                <span className="tr-stop-body">
                  <span className="tr-stop-label">{s.label}</span>
                  {s.sub && <span className="tr-stop-sub">{s.sub}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section className="tr-features">
        <p className="tr-eyebrow">Everything stays on track</p>
        <div className="tr-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="tr-feature">
              <span className="tr-feature-dot" />
              <h3 className="tr-feature-title">{f.title}</h3>
              <p className="tr-feature-text">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Why section ---------- */}
      <section className="tr-why">
        <p>
          No more patched spreadsheets and scattered text files.
          <br />
          One line, on every screen.
        </p>
      </section>

      {/* ---------- Final call to action ---------- */}
      <section className="tr-final">
        <h2 className="tr-final-title">Ready to pick up the thread?</h2>
        <button className="tr-btn-primary" onClick={onCreate}>
          Create account
        </button>
      </section>

      <footer className="tr-footer">
        TrackReport — your job search dashboard.
      </footer>
    </div>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Space+Mono:wght@400;700&display=swap');

.tr-root{
  --paper:#FBFBF8;
  --panel:#FFFFFF;
  --ink:#16181D;
  --muted:#5B626E;
  --rail:#DCDFE6;
  --brand:#4F46E5;
  --brand-soft:rgba(79,70,229,.14);
  --goal:#15A34A;
  --goal-soft:rgba(21,163,74,.18);
  --display:'Space Grotesk',sans-serif;
  --body:'Inter',sans-serif;
  --mono:'Space Mono',monospace;

  font-family:var(--body);
  color:var(--ink);
  background-color:var(--paper);
  background-image:radial-gradient(rgba(22,24,29,.045) 1px, transparent 1px);
  background-size:24px 24px;
  min-height:100vh;
  -webkit-font-smoothing:antialiased;
}
.tr-root *{box-sizing:border-box;}

/* Nav */
.tr-nav{
  max-width:1080px;margin:0 auto;padding:22px 24px;
  display:flex;align-items:center;justify-content:space-between;
}
.tr-brand{display:flex;align-items:center;gap:10px;font-family:var(--display);font-weight:600;font-size:1.15rem;letter-spacing:-.01em;}
.tr-nav-link{
  background:none;border:none;cursor:pointer;font-family:var(--body);
  font-size:.92rem;font-weight:500;color:var(--ink);padding:8px 4px;
  border-bottom:2px solid transparent;transition:border-color .2s;
}
.tr-nav-link:hover{border-color:var(--ink);}

/* Hero */
.tr-hero{
  max-width:1080px;margin:0 auto;padding:48px 24px 64px;
  display:grid;grid-template-columns:1.1fr .9fr;gap:56px;align-items:center;
}
.tr-eyebrow{
  font-family:var(--mono);font-size:.74rem;font-weight:700;letter-spacing:.18em;
  text-transform:uppercase;color:var(--brand);margin:0 0 18px;
}
.tr-h1{
  font-family:var(--display);font-weight:600;
  font-size:clamp(2.3rem,5.2vw,3.7rem);line-height:1.04;letter-spacing:-.025em;
  margin:0 0 22px;
}
.tr-lead{font-size:1.08rem;line-height:1.65;color:var(--muted);max-width:30ch;margin:0 0 32px;}
.tr-cta{display:flex;gap:12px;flex-wrap:wrap;}
.tr-btn-primary{
  font-family:var(--body);font-size:.95rem;font-weight:600;cursor:pointer;
  background:var(--ink);color:var(--paper);border:none;border-radius:999px;
  padding:13px 26px;transition:background .2s,transform .1s;
}
.tr-btn-primary:hover{background:var(--brand);}
.tr-btn-primary:active{transform:translateY(1px);}
.tr-btn-ghost{
  font-family:var(--body);font-size:.95rem;font-weight:600;cursor:pointer;
  background:transparent;color:var(--ink);border:1px solid var(--rail);
  border-radius:999px;padding:13px 26px;transition:border-color .2s;
}
.tr-btn-ghost:hover{border-color:var(--ink);}

/* Track card */
.tr-track-card{
  background:var(--panel);border:1px solid var(--rail);border-radius:20px;
  padding:28px 30px 14px;box-shadow:0 24px 48px -28px rgba(22,24,29,.22);
}
.tr-track-head{padding-bottom:16px;border-bottom:1px dashed var(--rail);margin-bottom:14px;}
.tr-tag{
  font-family:var(--mono);font-size:.7rem;font-weight:700;letter-spacing:.12em;
  text-transform:uppercase;color:var(--muted);
}
.tr-track-title{font-family:var(--display);font-weight:600;font-size:1.25rem;margin:8px 0 2px;letter-spacing:-.01em;}
.tr-track-meta{font-size:.9rem;color:var(--muted);margin:0;}

.tr-line{list-style:none;margin:0;padding:4px 0 0;}
.tr-stop{
  position:relative;display:grid;grid-template-columns:32px 1fr;align-items:center;
  min-height:56px;
  opacity:0;transform:translateY(7px);
  animation:trStopIn .5s ease forwards;
  animation-delay:calc(var(--i) * 130ms);
}
.tr-stop::before{
  content:'';position:absolute;left:15px;top:-28px;width:2px;height:56px;background:var(--rail);
}
.tr-stop:first-child::before{display:none;}
.tr-stop.tr-done::before,.tr-stop.tr-current::before{background:var(--brand);}
.tr-dot{
  width:16px;height:16px;border-radius:50%;margin-left:8px;z-index:1;
  background:var(--panel);border:2px solid var(--rail);
}
.tr-done .tr-dot{background:var(--brand);border-color:var(--brand);}
.tr-current .tr-dot{
  border-color:var(--brand);background:var(--panel);
  box-shadow:0 0 0 5px var(--brand-soft);
}
.tr-goal .tr-dot{
  border-color:var(--goal);background:var(--panel);
  box-shadow:0 0 0 5px var(--goal-soft);
  animation:trGlow 2.4s ease-in-out infinite;
  animation-delay:calc(var(--i) * 130ms + .4s);
}
.tr-stop-body{display:flex;flex-direction:column;line-height:1.2;}
.tr-stop-label{font-size:.96rem;color:var(--muted);}
.tr-current .tr-stop-label{color:var(--ink);font-weight:600;}
.tr-goal .tr-stop-label{color:var(--goal);font-weight:600;}
.tr-stop-sub{font-family:var(--mono);font-size:.68rem;color:var(--muted);margin-top:2px;}

/* Features */
.tr-features{max-width:1080px;margin:0 auto;padding:24px 24px 8px;}
.tr-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:8px;}
.tr-feature{
  background:var(--panel);border:1px solid var(--rail);border-radius:16px;padding:24px 24px 26px;
}
.tr-feature-dot{
  display:block;width:11px;height:11px;border-radius:50%;
  background:var(--brand);margin-bottom:16px;
}
.tr-feature-title{font-family:var(--display);font-weight:600;font-size:1.1rem;margin:0 0 8px;letter-spacing:-.01em;}
.tr-feature-text{font-size:.95rem;line-height:1.6;color:var(--muted);margin:0;}

/* Bandeau pourquoi */
.tr-why{max-width:1080px;margin:0 auto;padding:56px 24px;text-align:center;}
.tr-why p{
  font-family:var(--display);font-weight:500;
  font-size:clamp(1.3rem,3vw,1.9rem);line-height:1.4;letter-spacing:-.015em;margin:0;
}

/* CTA final */
.tr-final{
  max-width:1080px;margin:0 auto;padding:8px 24px 72px;text-align:center;
}
.tr-final-title{
  font-family:var(--display);font-weight:600;font-size:clamp(1.6rem,4vw,2.4rem);
  letter-spacing:-.02em;margin:0 0 24px;
}

.tr-footer{
  max-width:1080px;margin:0 auto;padding:28px 24px 48px;
  font-size:.85rem;color:var(--muted);border-top:1px solid var(--rail);
}

/* Responsive */
@media (max-width:860px){
  .tr-hero{grid-template-columns:1fr;gap:40px;padding-top:32px;}
  .tr-grid{grid-template-columns:1fr;}
}

@keyframes trStopIn{to{opacity:1;transform:none;}}
@keyframes trGlow{
  0%,100%{box-shadow:0 0 0 5px var(--goal-soft);}
  50%{box-shadow:0 0 0 9px rgba(21,163,74,.07);}
}

@media (prefers-reduced-motion:reduce){
  .tr-stop{animation:none;opacity:1;transform:none;}
  .tr-goal .tr-dot{animation:none;}
}
`