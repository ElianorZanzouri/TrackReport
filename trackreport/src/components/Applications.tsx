import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../db'
import { localInsert, localDelete } from '../sync'
import { STATUS, statusInfo } from '../Status'
import { uuid } from '../uuid'

type User = { id: string; email: string }
type ApplicationsProps = { user: User }

type AppView = {
  id: string
  position: string
  status_actuel: string
  date_update: string | null
  company_name: string | null
}

export default function Applications({ user }: ApplicationsProps) {
  const [list, setList] = useState<AppView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState('')
  const [company, setCompany] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  // Read from the local database, with a manual join for company name.
  async function load() {
    try {
      const [apps, companies] = await Promise.all([
        db.applications.toArray(),
        db.companies.toArray(),
      ])
      const nameById = new Map(companies.map((c) => [c.id, c.company_name]))
      apps.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      setList(
        apps.map((a) => ({
          id: a.id,
          position: a.position,
          status_actuel: a.status_actuel,
          date_update: a.date_update,
          company_name: a.company_id ? nameById.get(a.company_id) ?? null : null,
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
    setPosition('')
    setCompany('')
    setDescription('')
  }

  // Find the company by name (case-insensitive) or create it locally.
  async function getOrCreateCompany(name: string): Promise<string> {
    const trimmed = name.trim()
    const companies = await db.companies.toArray()
    const existing = companies.find(
      (c) => c.company_name.toLowerCase() === trimmed.toLowerCase()
    )
    if (existing) return existing.id

    const id = uuid()
    await localInsert('companies', {
      id,
      user_id: user.id,
      company_name: trimmed,
      domain: null,
      notes: null,
      created_at: new Date().toISOString(),
    })
    return id
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!position.trim() || !company.trim()) return
    setCreating(true)
    setError(null)

    try {
      const companyId = await getOrCreateCompany(company)
      const nowISO = new Date().toISOString()
      const today = nowISO.slice(0, 10)
      const appId = uuid()

      await localInsert('applications', {
        id: appId,
        user_id: user.id,
        company_id: companyId,
        position: position.trim(),
        description: description.trim() || null,
        status_actuel: 'applied',
        date_update: today,
        created_at: nowISO,
      })

      // First history entry
      await localInsert('histories_status', {
        id: uuid(),
        user_id: user.id,
        application_id: appId,
        status: 'applied',
        date_updated: nowISO,
        reason: null,
      })

      closeModal()
      await load()
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
    setCreating(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this application?')) return
    try {
      await localDelete('applications', id)
      setList((prev) => prev.filter((a) => a.id !== id))
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
  }

  const filtered = list.filter((a) => {
    const q = search.trim().toLowerCase()
    const matchText =
      !q ||
      a.position.toLowerCase().includes(q) ||
      (a.company_name ?? '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || a.status_actuel === statusFilter
    return matchText && matchStatus
  })

  return (
    <div className="apc-page">
      <style>{CSS}</style>

      <div className="apc-head">
        <div>
          <p className="apc-eyebrow">Tracking</p>
          <h1 className="apc-title">Your applications</h1>
        </div>
        <button className="apc-new" onClick={() => setOpen(true)}>
          + New application
        </button>
      </div>

      {list.length > 0 && (
        <div className="apc-filters">
          <input
            className="apc-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search role or company…"
          />
          <select
            className="apc-statusfilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            {Object.entries(STATUS).map(([value, s]) => (
              <option key={value} value={value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="apc-error">{error}</p>}

      {loading ? (
        <p className="apc-muted">Loading…</p>
      ) : list.length === 0 ? (
        <p className="apc-muted">
          No applications yet. Click "New application".
        </p>
      ) : filtered.length === 0 ? (
        <p className="apc-muted">No applications match these filters.</p>
      ) : (
        <ul className="apc-list">
          {filtered.map((a) => {
            const st = statusInfo(a.status_actuel)
            return (
              <li key={a.id} className="apc-card">
                <Link to={`/applications/${a.id}`} className="apc-card-link">
                  <div className="apc-card-main">
                    <h3 className="apc-card-title">{a.position}</h3>
                    <p className="apc-card-meta">
                      {a.company_name ?? 'Company not specified'}
                      {a.date_update && (
                        <span className="apc-date">
                          {' · '}
                          {new Date(a.date_update).toLocaleDateString('en-US')}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="apc-badge">
                    <span className="apc-badge-dot" style={{ background: st.color }} />
                    {st.label}
                  </span>
                </Link>
                <button
                  className="apc-del"
                  onClick={() => handleDelete(a.id)}
                  aria-label="Delete"
                  title="Delete"
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {open && (
        <div
          className="apc-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div className="apc-modal" role="dialog" aria-modal="true">
            <div className="apc-modal-head">
              <h2 className="apc-modal-title">New application</h2>
              <button className="apc-close" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <label className="apc-label">
                Position <span className="apc-req">*</span>
              </label>
              <input
                className="apc-field"
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                  placeholder="Front-End Developer"
              />
              <input
                className="apc-field"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Studio"
              />

              <label className="apc-label">Job description</label>
              <textarea
                className="apc-field apc-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tasks, tech stack, what you gathered from the listing…"
                rows={4}
              />

              <div className="apc-actions">
                <button type="button" className="apc-cancel" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="apc-submit"
                  disabled={creating || !position.trim() || !company.trim()}
                >
                  {creating ? 'Creating…' : 'Create'}
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
.apc-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:20px;flex-wrap:wrap;}
.apc-eyebrow{font-family:var(--mono);font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--brand);margin:8px 0 6px;}
.apc-title{font-family:var(--display);font-weight:600;font-size:2rem;letter-spacing:-.02em;margin:0;}
.apc-muted{color:var(--muted);}

.apc-new{font-family:var(--body);font-size:.92rem;font-weight:600;cursor:pointer;background:var(--ink);color:var(--paper);border:none;border-radius:999px;padding:11px 20px;transition:background .2s,transform .1s;}
.apc-new:hover{background:var(--brand);}
.apc-new:active{transform:translateY(1px);}

.apc-filters{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;}
.apc-search{flex:1;min-width:200px;font-family:var(--body);font-size:.92rem;color:var(--ink);background:var(--panel);border:1px solid var(--rail);border-radius:11px;padding:10px 13px;transition:border-color .2s,box-shadow .2s;}
.apc-search::placeholder{color:#A0A6B0;}
.apc-search:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft);}
.apc-statusfilter{font-family:var(--body);font-size:.92rem;color:var(--ink);background:var(--panel);border:1px solid var(--rail);border-radius:11px;padding:10px 13px;cursor:pointer;}
.apc-statusfilter:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft);}

.apc-error{color:#DC2626;font-size:.88rem;margin:0 0 16px;}

.apc-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;}
.apc-card{display:flex;align-items:center;gap:8px;background:var(--panel);border:1px solid var(--rail);border-radius:14px;padding:6px 12px 6px 6px;transition:border-color .2s;}
.apc-card:hover{border-color:#C4C8D0;}
.apc-card-link{flex:1;display:flex;align-items:center;gap:16px;text-decoration:none;color:inherit;padding:10px 6px 10px 12px;border-radius:10px;min-width:0;}
.apc-card-main{flex:1;min-width:0;}
.apc-card-title{font-family:var(--display);font-weight:600;font-size:1.05rem;margin:0 0 2px;letter-spacing:-.01em;}
.apc-card-meta{font-size:.86rem;color:var(--muted);margin:0;}
.apc-date{color:var(--muted);}
.apc-badge{display:inline-flex;align-items:center;gap:7px;white-space:nowrap;font-size:.82rem;font-weight:500;color:var(--ink);background:var(--paper);border:1px solid var(--rail);border-radius:999px;padding:5px 12px;}
.apc-badge-dot{width:8px;height:8px;border-radius:50%;display:inline-block;}
.apc-del{background:none;border:none;cursor:pointer;color:#B6BBC4;font-size:.95rem;padding:8px;border-radius:8px;transition:all .2s;}
.apc-del:hover{color:#DC2626;background:rgba(220,38,38,.08);}

.apc-overlay{position:fixed;inset:0;z-index:50;background:rgba(22,24,29,.45);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:20px;animation:apcFade .15s ease;}
.apc-modal{width:100%;max-width:460px;background:var(--panel);border:1px solid var(--rail);border-radius:20px;padding:26px;box-shadow:0 40px 80px -24px rgba(22,24,29,.4);animation:apcPop .18s ease;}
.apc-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
.apc-modal-title{font-family:var(--display);font-weight:600;font-size:1.3rem;letter-spacing:-.01em;margin:0;}
.apc-close{background:none;border:none;cursor:pointer;color:var(--muted);font-size:1rem;padding:6px;border-radius:8px;transition:all .2s;}
.apc-close:hover{color:var(--ink);background:rgba(22,24,29,.06);}
.apc-label{display:block;font-size:.82rem;font-weight:600;color:var(--ink);margin:0 0 6px;}
.apc-req{color:var(--brand);}
.apc-field{width:100%;font-family:var(--body);font-size:.95rem;color:var(--ink);background:var(--paper);border:1px solid var(--rail);border-radius:11px;padding:11px 13px;margin-bottom:16px;transition:border-color .2s,box-shadow .2s;}
.apc-field::placeholder{color:#A0A6B0;}
.apc-field:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft);}
.apc-textarea{resize:vertical;line-height:1.5;}
.apc-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:8px;}
.apc-cancel{font-family:var(--body);font-size:.92rem;font-weight:600;cursor:pointer;background:transparent;color:var(--ink);border:1px solid var(--rail);border-radius:999px;padding:11px 20px;transition:border-color .2s;}
.apc-cancel:hover{border-color:var(--ink);}
.apc-submit{font-family:var(--body);font-size:.92rem;font-weight:600;cursor:pointer;background:var(--ink);color:var(--paper);border:none;border-radius:999px;padding:11px 22px;transition:background .2s,transform .1s;}
.apc-submit:hover{background:var(--brand);}
.apc-submit:active{transform:translateY(1px);}
.apc-submit:disabled{opacity:.5;cursor:default;}

@keyframes apcFade{from{opacity:0;}to{opacity:1;}}
@keyframes apcPop{from{opacity:0;transform:translateY(8px) scale(.98);}to{opacity:1;transform:none;}}

@media (max-width:560px){
  .apc-card-link{flex-wrap:wrap;}
  .apc-badge{order:3;}
}
`