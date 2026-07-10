import { useEffect, useState } from 'react'
import { db } from '../db'
import { localInsert } from '../sync'

type User = { id: string; email: string }
type ProfileProps = { user: User }

export default function Profile({ user }: ProfileProps) {
  const [fullName, setFullName] = useState('')
  const [about, setAbout] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<
    { type: 'error' | 'success'; text: string } | null
  >(null)

  useEffect(() => {
    async function load() {
      try {
        const p = await db.profils.get(user.id)
        if (p) {
          setFullName(p.full_name ?? '')
          setAbout(p.about ?? '')
        }
      } catch (e: any) {
        setMessage({ type: 'error', text: e.message ?? String(e) })
      }
      setLoading(false)
    }
    load()
  }, [user.id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      // Local write + outbox (upsert on server).
      await localInsert('profils', {
        id: user.id,
        mail: user.email,
        full_name: fullName,
        about: about,
      })
      setMessage({ type: 'success', text: 'Profile saved.' })
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message ?? String(e) })
    }
    setSaving(false)
  }

  return (
    <div className="trp-page">
      <style>{CSS}</style>

      <p className="trp-eyebrow">Profile</p>
      <h1 className="trp-title">Your profile</h1>

      {loading ? (
        <p className="trp-loading">Loading…</p>
      ) : (
        <form className="trp-card" onSubmit={handleSave}>
          <label className="trp-label">Email</label>
          <input className="trp-input trp-readonly" value={user.email ?? ''} readOnly />
          <p className="trp-hint">Linked to your account, not editable here.</p>

          <label className="trp-label">Full name</label>
          <input
            className="trp-input"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Camille Dupont"
          />

          <label className="trp-label">About</label>
          <textarea
            className="trp-input trp-textarea"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="A few words about your background and what you are looking for…"
            rows={4}
          />

          {message && (
            <p className={message.type === 'error' ? 'trp-msg-err' : 'trp-msg-ok'}>
              {message.text}
            </p>
          )}

          <button className="trp-save" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}
    </div>
  )
}

const CSS = `
.trp-eyebrow{font-family:var(--mono);font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--brand);margin:8px 0 6px;}
.trp-title{font-family:var(--display);font-weight:600;font-size:2rem;letter-spacing:-.02em;margin:0 0 24px;}
.trp-loading{color:var(--muted);}

.trp-card{max-width:560px;background:var(--panel);border:1px solid var(--rail);border-radius:20px;padding:28px;box-shadow:0 24px 48px -30px rgba(22,24,29,.22);}
.trp-label{display:block;font-size:.82rem;font-weight:600;color:var(--ink);margin:0 0 6px;}
.trp-input{width:100%;font-family:var(--body);font-size:.95rem;color:var(--ink);background:var(--paper);border:1px solid var(--rail);border-radius:11px;padding:11px 13px;transition:border-color .2s,box-shadow .2s;}
.trp-input::placeholder{color:#A0A6B0;}
.trp-input:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft);}
.trp-textarea{resize:vertical;line-height:1.5;}
.trp-readonly{background:#F1F2F5;color:var(--muted);cursor:not-allowed;}
.trp-hint{font-size:.78rem;color:var(--muted);margin:6px 0 18px;}
.trp-label + .trp-input{margin-bottom:18px;}
.trp-textarea{margin-bottom:0;}
.trp-msg-err{color:#DC2626;font-size:.85rem;margin:16px 0 0;}
.trp-msg-ok{color:var(--goal);font-size:.85rem;margin:16px 0 0;}
.trp-save{width:100%;font-family:var(--body);font-size:.95rem;font-weight:600;cursor:pointer;background:var(--ink);color:var(--paper);border:none;border-radius:999px;padding:13px 0;margin-top:22px;transition:background .2s,transform .1s;}
.trp-save:hover{background:var(--brand);}
.trp-save:active{transform:translateY(1px);}
.trp-save:disabled{opacity:.55;cursor:default;}
`