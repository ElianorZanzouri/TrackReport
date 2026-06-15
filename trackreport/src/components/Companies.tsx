import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { db } from '../db'
import { localInsert, localDelete } from '../sync'

type Props = { user: User }

type CompanyView = {
  id: string
  company_name: string
  domain: string | null
  contactCount: number
}

export default function Companies({ user }: Props) {
  const [list, setList] = useState<CompanyView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [notes, setNotes] = useState('')
  const [creating, setCreating] = useState(false)

  async function load() {
    try {
      const [companies, contacts] = await Promise.all([
        db.companies.toArray(),
        db.contacts.toArray(),
      ])
      const countById = new Map<string, number>()
      for (const c of contacts) {
        countById.set(c.company_id, (countById.get(c.company_id) ?? 0) + 1)
      }
      companies.sort((a, b) => a.company_name.localeCompare(b.company_name))
      setList(
        companies.map((c) => ({
          id: c.id,
          company_name: c.company_name,
          domain: c.domain,
          contactCount: countById.get(c.id) ?? 0,
        }))
      )
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeModal()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  function closeModal() {
    setOpen(false)
    setName('')
    setDomain('')
    setNotes('')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    try {
      await localInsert('companies', {
        id: crypto.randomUUID(),
        user_id: user.id,
        company_name: name.trim(),
        domain: domain.trim() || null,
        notes: notes.trim() || null,
        created_at: new Date().toISOString(),
      })
      closeModal()
      await load()
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
    setCreating(false)
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        'Supprimer cette entreprise ? Ses contacts seront supprimés, et les candidatures liées seront déliées (mais conservées).'
      )
    )
      return
    try {
      // Suppression synchronisée de l'entreprise (le serveur cascade les contacts
      // et délie les candidatures).
      await localDelete('companies', id)
      // Cohérence locale immédiate (le serveur fera la même chose de son côté).
      await db.contacts.where('company_id').equals(id).delete()
      await db.applications.where('company_id').equals(id).modify({ company_id: null })
      setList((prev) => prev.filter((c) => c.id !== id))
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
  }

  return (
    <div className="cmp-page">
      <style>{CSS}</style>

      <div className="cmp-head">
        <div>
          <p className="cmp-eyebrow">Réseau</p>
          <h1 className="cmp-title">Entreprises &amp; contacts</h1>
        </div>
        <button className="cmp-new" onClick={() => setOpen(true)}>
          + Nouvelle entreprise
        </button>
      </div>

      {error && <p className="cmp-error">{error}</p>}

      {loading ? (
        <p className="cmp-muted">Chargement…</p>
      ) : list.length === 0 ? (
        <p className="cmp-muted">
          Aucune entreprise pour l’instant. Elles apparaîtront ici dès votre
          première candidature, ou ajoutez-en une manuellement.
        </p>
      ) : (
        <ul className="cmp-list">
          {list.map((c) => (
            <li key={c.id} className="cmp-card">
              <Link to={`/entreprises/${c.id}`} className="cmp-card-link">
                <div className="cmp-card-main">
                  <h3 className="cmp-card-title">{c.company_name}</h3>
                  <p className="cmp-card-meta">
                    {c.domain ? c.domain : 'Domaine non précisé'}
                    <span className="cmp-count">
                      {' · '}
                      {c.contactCount} contact{c.contactCount > 1 ? 's' : ''}
                    </span>
                  </p>
                </div>
                <span className="cmp-arrow">→</span>
              </Link>
              <button
                className="cmp-del"
                onClick={() => handleDelete(c.id)}
                aria-label="Supprimer"
                title="Supprimer"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div
          className="cmp-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div className="cmp-modal" role="dialog" aria-modal="true">
            <div className="cmp-modal-head">
              <h2 className="cmp-modal-title">Nouvelle entreprise</h2>
              <button className="cmp-close" onClick={closeModal} aria-label="Fermer">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <label className="cmp-label">
                Nom <span className="cmp-req">*</span>
              </label>
              <input
                className="cmp-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Studio"
                autoFocus
              />
              <label className="cmp-label">Domaine d’activité</label>
              <input
                className="cmp-field"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Logiciel, finance, design…"
              />
              <label className="cmp-label">Notes</label>
              <textarea
                className="cmp-field cmp-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ce que vous savez sur l’entreprise…"
                rows={3}
              />
              <div className="cmp-actions">
                <button type="button" className="cmp-cancel" onClick={closeModal}>
                  Annuler
                </button>
                <button
                  type="submit"
                  className="cmp-submit"
                  disabled={creating || !name.trim()}
                >
                  {creating ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const CSS = `
.cmp-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:24px;flex-wrap:wrap;}
.cmp-eyebrow{font-family:var(--mono);font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--brand);margin:8px 0 6px;}
.cmp-title{font-family:var(--display);font-weight:600;font-size:2rem;letter-spacing:-.02em;margin:0;}
.cmp-muted{color:var(--muted);}
.cmp-error{color:#DC2626;font-size:.88rem;margin:0 0 16px;}

.cmp-new{font-family:var(--body);font-size:.92rem;font-weight:600;cursor:pointer;background:var(--ink);color:var(--paper);border:none;border-radius:999px;padding:11px 20px;transition:background .2s,transform .1s;}
.cmp-new:hover{background:var(--brand);}
.cmp-new:active{transform:translateY(1px);}

.cmp-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;}
.cmp-card{display:flex;align-items:center;gap:8px;background:var(--panel);border:1px solid var(--rail);border-radius:14px;padding:6px 12px 6px 6px;transition:border-color .2s;}
.cmp-card:hover{border-color:#C4C8D0;}
.cmp-card-link{flex:1;display:flex;align-items:center;gap:16px;text-decoration:none;color:inherit;padding:12px 6px 12px 12px;border-radius:10px;min-width:0;}
.cmp-card-main{flex:1;min-width:0;}
.cmp-card-title{font-family:var(--display);font-weight:600;font-size:1.05rem;margin:0 0 2px;letter-spacing:-.01em;}
.cmp-card-meta{font-size:.86rem;color:var(--muted);margin:0;}
.cmp-count{color:var(--muted);}
.cmp-arrow{color:#B6BBC4;font-size:1rem;}
.cmp-del{background:none;border:none;cursor:pointer;color:#B6BBC4;font-size:.95rem;padding:8px;border-radius:8px;transition:all .2s;}
.cmp-del:hover{color:#DC2626;background:rgba(220,38,38,.08);}

.cmp-overlay{position:fixed;inset:0;z-index:50;background:rgba(22,24,29,.45);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:20px;animation:cmpFade .15s ease;}
.cmp-modal{width:100%;max-width:460px;background:var(--panel);border:1px solid var(--rail);border-radius:20px;padding:26px;box-shadow:0 40px 80px -24px rgba(22,24,29,.4);animation:cmpPop .18s ease;}
.cmp-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
.cmp-modal-title{font-family:var(--display);font-weight:600;font-size:1.3rem;letter-spacing:-.01em;margin:0;}
.cmp-close{background:none;border:none;cursor:pointer;color:var(--muted);font-size:1rem;padding:6px;border-radius:8px;transition:all .2s;}
.cmp-close:hover{color:var(--ink);background:rgba(22,24,29,.06);}
.cmp-label{display:block;font-size:.82rem;font-weight:600;color:var(--ink);margin:0 0 6px;}
.cmp-req{color:var(--brand);}
.cmp-field{width:100%;font-family:var(--body);font-size:.95rem;color:var(--ink);background:var(--paper);border:1px solid var(--rail);border-radius:11px;padding:11px 13px;margin-bottom:16px;transition:border-color .2s,box-shadow .2s;}
.cmp-field::placeholder{color:#A0A6B0;}
.cmp-field:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft);}
.cmp-textarea{resize:vertical;line-height:1.5;}
.cmp-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:8px;}
.cmp-cancel{font-family:var(--body);font-size:.92rem;font-weight:600;cursor:pointer;background:transparent;color:var(--ink);border:1px solid var(--rail);border-radius:999px;padding:11px 20px;transition:border-color .2s;}
.cmp-cancel:hover{border-color:var(--ink);}
.cmp-submit{font-family:var(--body);font-size:.92rem;font-weight:600;cursor:pointer;background:var(--ink);color:var(--paper);border:none;border-radius:999px;padding:11px 22px;transition:background .2s,transform .1s;}
.cmp-submit:hover{background:var(--brand);}
.cmp-submit:disabled{opacity:.5;cursor:default;}

@keyframes cmpFade{from{opacity:0;}to{opacity:1;}}
@keyframes cmpPop{from{opacity:0;transform:translateY(8px) scale(.98);}to{opacity:1;transform:none;}}
`