import { useState } from 'react'
import { apiPost, setToken } from '../api'

type AuthUser = { id: string; email: string; full_name?: string | null }

type AuthProps = {
  initialMode?: 'signin' | 'signup'
  onBack?: () => void
  onAuthed: (user: AuthUser) => void
}

// Sign-in/sign-up screen, aligned with the landing page design.
export default function Auth({ initialMode = 'signin', onBack, onAuthed }: AuthProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<
    { type: 'error' | 'success'; text: string } | null
  >(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const path = mode === 'signup' ? '/auth/register' : '/auth/login'
      const data = await apiPost(path, { email, password })
      // The server returns { token, user }: we store the token and log in.
      setToken(data.token)
      onAuthed(data.user)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message ?? String(err) })
    }

    setLoading(false)
  }

  return (
    <div className="tra-root">
      <style>{CSS}</style>

      <div className="tra-wrap">
        {onBack && (
          <button className="tra-back" onClick={onBack}>
            ← Back
          </button>
        )}

        <div className="tra-brand">
          <svg width="30" height="14" viewBox="0 0 30 14" aria-hidden="true">
            <line x1="3" y1="7" x2="27" y2="7" stroke="var(--brand)" strokeWidth="2" />
            <circle cx="3" cy="7" r="3.5" fill="var(--brand)" />
            <circle cx="15" cy="7" r="3.5" fill="var(--paper)" stroke="var(--brand)" strokeWidth="2" />
            <circle cx="27" cy="7" r="3.5" fill="var(--goal)" />
          </svg>
          <span>TrackReport</span>
        </div>

        <p className="tra-eyebrow">
          {mode === 'signin' ? 'Good to see you again' : "Let's get started"}
        </p>
        <h1 className="tra-title">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>

        <div className="tra-card">
          <div className="tra-tabs">
            <button
              type="button"
              className={mode === 'signin' ? 'tra-tab tra-tab-on' : 'tra-tab'}
              onClick={() => {
                setMode('signin')
                setMessage(null)
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === 'signup' ? 'tra-tab tra-tab-on' : 'tra-tab'}
              onClick={() => {
                setMode('signup')
                setMessage(null)
              }}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="tra-label">Email</label>
            <input
              className="tra-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="example@example.com"
            />

            <label className="tra-label">Password</label>
            <input
              className="tra-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            {message && (
              <p className={message.type === 'error' ? 'tra-msg-err' : 'tra-msg-ok'}>
                {message.text}
              </p>
            )}

            <button className="tra-submit" type="submit" disabled={loading}>
              {loading
                ? 'Please wait…'
                : mode === 'signin'
                ? 'Sign in'
                : 'Create account'}
            </button>
          </form>
        </div>

        <p className="tra-foot">
          {mode === 'signin'
            ? 'Your applications are waiting for you, exactly where you left them.'
            : 'A few seconds, and you will have all your applications in one place.'}
        </p>
      </div>
    </div>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Space+Mono:wght@400;700&display=swap');

.tra-root{
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
  display:flex;align-items:center;justify-content:center;
  padding:32px 20px;
  -webkit-font-smoothing:antialiased;
}
.tra-root *{box-sizing:border-box;}

.tra-wrap{width:100%;max-width:400px;}

.tra-back{
  background:none;border:none;cursor:pointer;font-family:var(--body);
  font-size:.9rem;color:var(--muted);padding:4px 0;margin-bottom:20px;transition:color .2s;
}
.tra-back:hover{color:var(--ink);}

.tra-brand{
  display:flex;align-items:center;gap:10px;justify-content:center;
  font-family:var(--display);font-weight:600;font-size:1.1rem;letter-spacing:-.01em;
  margin-bottom:26px;
}
.tra-eyebrow{
  font-family:var(--mono);font-size:.72rem;font-weight:700;letter-spacing:.16em;
  text-transform:uppercase;color:var(--brand);text-align:center;margin:0 0 6px;
}
.tra-title{
  font-family:var(--display);font-weight:600;font-size:1.9rem;letter-spacing:-.02em;
  text-align:center;margin:0 0 26px;
}

.tra-card{
  background:var(--panel);border:1px solid var(--rail);border-radius:20px;
  padding:26px;box-shadow:0 24px 48px -30px rgba(22,24,29,.22);
}

.tra-tabs{
  display:flex;gap:4px;background:#F1F2F5;border-radius:12px;padding:4px;margin-bottom:22px;
}
.tra-tab{
  flex:1;border:none;cursor:pointer;font-family:var(--body);font-size:.9rem;font-weight:500;
  color:var(--muted);background:transparent;padding:9px 0;border-radius:9px;transition:all .2s;
}
.tra-tab-on{background:var(--panel);color:var(--ink);box-shadow:0 1px 3px rgba(22,24,29,.1);}

.tra-label{
  display:block;font-size:.82rem;font-weight:600;color:var(--ink);
  margin:0 0 6px;
}
.tra-input{
  width:100%;font-family:var(--body);font-size:.95rem;color:var(--ink);
  background:var(--paper);border:1px solid var(--rail);border-radius:11px;
  padding:11px 13px;margin-bottom:18px;transition:border-color .2s,box-shadow .2s;
}
.tra-input::placeholder{color:#A0A6B0;}
.tra-input:focus{
  outline:none;border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft);
}

.tra-msg-err{color:#DC2626;font-size:.85rem;margin:0 0 16px;}
.tra-msg-ok{color:var(--goal);font-size:.85rem;margin:0 0 16px;}

.tra-submit{
  width:100%;font-family:var(--body);font-size:.95rem;font-weight:600;cursor:pointer;
  background:var(--ink);color:var(--paper);border:none;border-radius:999px;
  padding:13px 0;margin-top:4px;transition:background .2s,transform .1s;
}
.tra-submit:hover{background:var(--brand);}
.tra-submit:active{transform:translateY(1px);}
.tra-submit:disabled{opacity:.55;cursor:default;}

.tra-foot{
  text-align:center;font-size:.86rem;color:var(--muted);line-height:1.5;
  margin:22px auto 0;max-width:34ch;
}
`