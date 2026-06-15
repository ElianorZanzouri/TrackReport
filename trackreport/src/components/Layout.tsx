import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { syncSoon, pendingCount } from '../sync'

export default function Layout() {
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const refresh = async () => setPending(await pendingCount())
    refresh()
    syncSoon() // au démarrage : on remonte la file et on rafraîchit le local

    const goOnline = () => {
      setOnline(true)
      syncSoon()
    }
    const goOffline = () => setOnline(false)
    const onChange = () => refresh()
    const onStart = () => setSyncing(true)
    const onEnd = () => {
      setSyncing(false)
      refresh()
    }

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    window.addEventListener('tr-sync', onChange)
    window.addEventListener('tr-sync-start', onStart)
    window.addEventListener('tr-sync-end', onEnd)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('tr-sync', onChange)
      window.removeEventListener('tr-sync-start', onStart)
      window.removeEventListener('tr-sync-end', onEnd)
    }
  }, [])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'trl-link trl-link-on' : 'trl-link'

  return (
    <div className="trl-root">
      <style>{CSS}</style>

      {!online && (
        <div className="trl-offline">
          Hors ligne — vos modifications sont enregistrées et seront envoyées au
          retour de la connexion.
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
          <NavLink to="/" end className={linkClass}>Candidatures</NavLink>
          <NavLink to="/entreprises" className={linkClass}>Entreprises</NavLink>
          <NavLink to="/questions" className={linkClass}>Questions</NavLink>
          <NavLink to="/profil" className={linkClass}>Profil</NavLink>
        </nav>

        {(syncing || pending > 0) && (
          <button
            className="trl-sync"
            onClick={() => syncSoon()}
            title="Cliquer pour synchroniser maintenant"
          >
            {syncing ? (
              <>
                <span className="trl-spin" />
                Synchronisation…
              </>
            ) : (
              <>
                <span className="trl-pendingdot" />
                {pending} en attente
              </>
            )}
          </button>
        )}

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
  display:flex;align-items:center;gap:16px;
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

.trl-sync{
  display:inline-flex;align-items:center;gap:7px;cursor:pointer;
  font-family:var(--body);font-size:.8rem;font-weight:500;color:var(--brand);
  background:var(--brand-soft);border:none;border-radius:999px;padding:6px 12px;
  transition:filter .2s;white-space:nowrap;
}
.trl-sync:hover{filter:brightness(.96);}
.trl-pendingdot{width:7px;height:7px;border-radius:50%;background:var(--brand);display:inline-block;}
.trl-spin{
  width:11px;height:11px;border-radius:50%;
  border:2px solid var(--brand-soft);border-top-color:var(--brand);
  display:inline-block;animation:trlspin .7s linear infinite;
}

.trl-signout{
  background:none;border:none;cursor:pointer;font-family:var(--body);
  font-size:.9rem;color:var(--muted);padding:6px 2px;transition:color .2s;
}
.trl-signout:hover{color:var(--ink);}

.trl-main{max-width:880px;margin:0 auto;padding:16px 24px 64px;}

@keyframes trlspin{to{transform:rotate(360deg);}}

@media (max-width:620px){
  .trl-nav{flex-wrap:wrap;gap:12px;}
  .trl-links{order:3;flex-basis:100%;margin-left:0;}
}
`