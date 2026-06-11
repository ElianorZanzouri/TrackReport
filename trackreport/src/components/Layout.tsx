import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { syncAll } from '../sync'

// Mise en page commune : barre de navigation, bandeau hors ligne, puis le contenu.
export default function Layout() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    // Au démarrage : on remonte les écritures en attente, puis on rafraîchit le local.
    syncAll()

    const goOnline = () => {
      setOnline(true)
      syncAll() // au retour du réseau : on synchronise dans les deux sens
    }
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'trl-link trl-link-on' : 'trl-link'

  return (
    <div className="trl-root">
      <style>{CSS}</style>

      {!online && (
        <div className="trl-offline">
          Hors ligne — vous consultez des données enregistrées. Les
          modifications nécessitent une connexion.
        </div>
      )}

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
            Candidatures
          </NavLink>
          <NavLink to="/entreprises" className={linkClass}>
            Entreprises
          </NavLink>
          <NavLink to="/questions" className={linkClass}>
            Questions
          </NavLink>
          <NavLink to="/profil" className={linkClass}>
            Profil
          </NavLink>
        </nav>

        <button className="trl-signout" onClick={() => supabase.auth.signOut()}>
          Se déconnecter
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

.trl-offline{
  background:#FEF3C7;color:#92400E;text-align:center;
  font-size:.85rem;font-weight:500;padding:8px 16px;
  border-bottom:1px solid #FDE68A;
}

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