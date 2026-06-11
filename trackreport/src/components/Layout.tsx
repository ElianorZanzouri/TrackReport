import { Link, NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../supabaseClient'

// Shared layout for all pages in the signed-in app:
// the top navigation bar, then the page content from <Outlet>.
export default function Layout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'trl-link trl-link-on' : 'trl-link'

  return (
    <div className="trl-root">
      <style>{CSS}</style>

      <header className="trl-nav">
        <Link to="/" className="trl-brand">
          <svg width="30" height="14" viewBox="0 0 30 14" aria-hidden="true">
            <line x1="3" y1="7" x2="27" y2="7" stroke="var(--brand)" strokeWidth="2" />
            <circle cx="3" cy="7" r="3.5" fill="var(--brand)" />
            <circle cx="15" cy="7" r="3.5" fill="var(--paper)" stroke="var(--brand)" strokeWidth="2" />
            <circle cx="27" cy="7" r="3.5" fill="var(--goal)" />
          </svg>
          <span>TrackReport</span>
        </Link>

        <nav className="trl-links">
          <NavLink to="/" end className={linkClass}>
            Applications
          </NavLink>
          <NavLink to="/companies" className={linkClass}>
            Companies
          </NavLink>
          <NavLink to="/questions" className={linkClass}>
            Questions
          </NavLink>
          <NavLink to="/profile" className={linkClass}>
            Profile
          </NavLink>
        </nav>

        <button className="trl-signout" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </header>

      <main className="trl-main">
        <Outlet />
      </main>
    </div>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Space+Mono:wght@400;700&display=swap');

/* Design variables are defined here and inherited by all
   pages rendered inside <Outlet> (Profile, Applications, etc.). */
.trl-root{
  --paper:#FBFBF8;
  --panel:#FFFFFF;
  --ink:#16181D;
  --muted:#5B626E;
  --rail:#DCDFE6;
  --brand:#4F46E5;
  --brand-soft:rgba(79,70,229,.14);
  --goal:#15A34A;
  --display:'Space Grotesk',sans-serif;
  --body:'Inter',sans-serif;
  --mono:'Space Mono',monospace;

  font-family:var(--body);color:var(--ink);
  background-color:var(--paper);
  background-image:radial-gradient(rgba(22,24,29,.045) 1px, transparent 1px);
  background-size:24px 24px;
  min-height:100vh;
  -webkit-font-smoothing:antialiased;
}
.trl-root *{box-sizing:border-box;}

.trl-nav{
  max-width:880px;margin:0 auto;padding:20px 24px;
  display:flex;align-items:center;gap:24px;
}
.trl-brand{
  display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);
  font-family:var(--display);font-weight:600;font-size:1.1rem;letter-spacing:-.01em;
}
.trl-links{display:flex;gap:6px;margin-left:12px;flex:1;}
.trl-link{
  text-decoration:none;font-size:.92rem;font-weight:500;color:var(--muted);
  padding:7px 12px;border-radius:8px;transition:all .2s;
}
.trl-link:hover{color:var(--ink);background:rgba(22,24,29,.04);}
.trl-link-on{color:var(--ink);background:var(--brand-soft);}
.trl-signout{
  background:none;border:none;cursor:pointer;font-family:var(--body);
  font-size:.9rem;color:var(--muted);padding:6px 2px;transition:color .2s;
}
.trl-signout:hover{color:var(--ink);}

.trl-main{max-width:880px;margin:0 auto;padding:16px 24px 64px;}

@media (max-width:560px){
  .trl-nav{flex-wrap:wrap;gap:14px;}
  .trl-links{order:3;flex-basis:100%;margin-left:0;}
}
`