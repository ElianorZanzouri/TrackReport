import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { db, type Contact, type Company } from '../db'
import { localInsert, localUpdate, localDelete } from '../sync'
import { statusInfo } from '../Status'
import { uuid } from '../uuid'

type User = { id: string; email: string }
type Props = { user: User }

type AppRow = { id: string; position: string; status_actuel: string }

export default function CompanyDetail({ user }: Props) {
  const { id } = useParams()
  const [company, setCompany] = useState<Company | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [apps, setApps] = useState<AppRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [notes, setNotes] = useState('')
  const [savingCompany, setSavingCompany] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  const [contactOpen, setContactOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [cName, setCName] = useState('')
  const [cPosition, setCPosition] = useState('')
  const [cMail, setCMail] = useState('')
  const [cPhone, setCPhone] = useState('')
  const [cNotes, setCNotes] = useState('')
  const [savingContact, setSavingContact] = useState(false)

  async function load() {
    if (!id) return
    try {
      const c = (await db.companies.get(id)) ?? null
      setCompany(c)
      if (c) {
        setName(c.company_name)
        setDomain(c.domain ?? '')
        setNotes(c.notes ?? '')
      }

      const cts = await db.contacts.where('company_id').equals(id).toArray()
      cts.sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
      setContacts(cts)

      const ap = await db.applications.where('company_id').equals(id).toArray()
      ap.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      setApps(ap.map((a) => ({ id: a.id, position: a.position, status_actuel: a.status_actuel })))
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  useEffect(() => {
    if (!contactOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeContact()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [contactOpen])

  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !name.trim()) return
    setSavingCompany(true)
    setError(null)
    setSavedMsg(false)
    try {
      await localUpdate('companies', id, {
        company_name: name.trim(),
        domain: domain.trim() || null,
        notes: notes.trim() || null,
      })
      setSavedMsg(true)
      setCompany((prev) => (prev ? { ...prev, company_name: name.trim() } : prev))
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
    setSavingCompany(false)
  }

  function openAddContact() {
    setEditingId(null)
    setCName('')
    setCPosition('')
    setCMail('')
    setCPhone('')
    setCNotes('')
    setContactOpen(true)
  }
  function openEditContact(c: Contact) {
    setEditingId(c.id)
    setCName(c.name)
    setCPosition(c.position ?? '')
    setCMail(c.mail ?? '')
    setCPhone(c.phone ?? '')
    setCNotes(c.notes ?? '')
    setContactOpen(true)
  }
  function closeContact() {
    setContactOpen(false)
  }

  async function handleSaveContact(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !cName.trim()) return
    setSavingContact(true)
    setError(null)

    const fields = {
      name: cName.trim(),
      position: cPosition.trim() || null,
      mail: cMail.trim() || null,
      phone: cPhone.trim() || null,
      notes: cNotes.trim() || null,
    }

    try {
      if (editingId) {
        await localUpdate('contacts', editingId, fields)
      } else {
        await localInsert('contacts', {
          id: uuid(),
          user_id: user.id,
          company_id: id,
          created_at: new Date().toISOString(),
          ...fields,
        })
      }
      closeContact()
      await load()
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
    setSavingContact(false)
  }

  async function handleDeleteContact(contactId: string) {
    if (!confirm('Delete this contact?')) return
    try {
      await localDelete('contacts', contactId)
      setContacts((prev) => prev.filter((c) => c.id !== contactId))
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
  }

  if (loading) {
    return (
      <div className="cpd-page">
        <style>{CSS}</style>
        <p className="cpd-muted">Loading…</p>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="cpd-page">
        <style>{CSS}</style>
        <Link to="/companies" className="cpd-back">← All companies</Link>
        <p className="cpd-muted">Company not found.</p>
      </div>
    )
  }

  return (
    <div className="cpd-page">
      <style>{CSS}</style>

      <Link to="/companies" className="cpd-back">← All companies</Link>
      <h1 className="cpd-title">{company.company_name}</h1>

      {error && <p className="cpd-error">{error}</p>}

      <form className="cpd-card" onSubmit={handleSaveCompany}>
        <h2 className="cpd-card-title">Information</h2>
        <label className="cpd-label">Name</label>
        <input
          className="cpd-field"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setSavedMsg(false)
          }}
        />
        <label className="cpd-label">Industry</label>
        <input
          className="cpd-field"
          value={domain}
          onChange={(e) => {
            setDomain(e.target.value)
            setSavedMsg(false)
          }}
          placeholder="Software, finance, design…"
        />
        <label className="cpd-label">Notes</label>
        <textarea
          className="cpd-field cpd-textarea"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value)
            setSavedMsg(false)
          }}
          rows={3}
        />
        <div className="cpd-saverow">
          {savedMsg && <span className="cpd-saved">Saved.</span>}
          <button className="cpd-save" type="submit" disabled={savingCompany}>
            {savingCompany ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>

      <div className="cpd-card">
        <div className="cpd-card-head">
          <h2 className="cpd-card-title cpd-nomargin">Contacts</h2>
          <button className="cpd-addbtn" onClick={openAddContact}>
            + Add contact
          </button>
        </div>

        {contacts.length === 0 ? (
          <p className="cpd-muted">No contacts for this company.</p>
        ) : (
          <ul className="cpd-contacts">
            {contacts.map((c) => (
              <li key={c.id} className="cpd-contact">
                <button className="cpd-contact-main" onClick={() => openEditContact(c)}>
                  <span className="cpd-contact-name">{c.name}</span>
                  {c.position && <span className="cpd-contact-role">{c.position}</span>}
                  {(c.mail || c.phone) && (
                    <span className="cpd-contact-coords">
                      {[c.mail, c.phone].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {c.notes && <span className="cpd-contact-note">{c.notes}</span>}
                </button>
                <button
                  className="cpd-contact-del"
                  onClick={() => handleDeleteContact(c.id)}
                  aria-label="Delete"
                  title="Delete"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="cpd-card">
        <h2 className="cpd-card-title">Applications at this company</h2>
        {apps.length === 0 ? (
          <p className="cpd-muted">No linked applications.</p>
        ) : (
          <ul className="cpd-apps">
            {apps.map((a) => {
              const st = statusInfo(a.status_actuel)
              return (
                <li key={a.id}>
                  <Link to={`/applications/${a.id}`} className="cpd-app">
                    <span>{a.position}</span>
                    <span className="cpd-app-badge">
                      <span className="cpd-app-dot" style={{ background: st.color }} />
                      {st.label}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {contactOpen && (
        <div
          className="cpd-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeContact()
          }}
        >
          <div className="cpd-modal" role="dialog" aria-modal="true">
            <div className="cpd-modal-head">
              <h2 className="cpd-modal-title">
                {editingId ? 'Edit contact' : 'New contact'}
              </h2>
              <button className="cpd-close" onClick={closeContact} aria-label="Close">
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveContact}>
              <label className="cpd-label">
                Name <span className="cpd-req">*</span>
              </label>
              <input
                className="cpd-field"
                value={cName}
                onChange={(e) => setCName(e.target.value)}
                placeholder="Camille Dupont"
                autoFocus
              />
              <label className="cpd-label">Role</label>
              <input
                className="cpd-field"
                value={cPosition}
                onChange={(e) => setCPosition(e.target.value)}
                placeholder="Recruiter, manager, HR…"
              />
              <div className="cpd-row2">
                <div>
                  <label className="cpd-label">Email</label>
                  <input
                    className="cpd-field"
                    value={cMail}
                    onChange={(e) => setCMail(e.target.value)}
                    placeholder="camille@acme.com"
                  />
                </div>
                <div>
                  <label className="cpd-label">Phone</label>
                  <input
                    className="cpd-field"
                    value={cPhone}
                    onChange={(e) => setCPhone(e.target.value)}
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>
              <label className="cpd-label">Notes</label>
              <textarea
                className="cpd-field cpd-textarea"
                value={cNotes}
                onChange={(e) => setCNotes(e.target.value)}
                placeholder="Met at an event, very responsive by email…"
                rows={3}
              />
              <div className="cpd-actions">
                <button type="button" className="cpd-cancel" onClick={closeContact}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cpd-submit"
                  disabled={savingContact || !cName.trim()}
                >
                  {savingContact
                    ? 'Saving…'
                    : editingId
                    ? 'Save'
                    : 'Add'}
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
.cpd-muted{color:var(--muted);}
.cpd-back{display:inline-block;text-decoration:none;color:var(--muted);font-size:.9rem;margin:8px 0 16px;transition:color .2s;}
.cpd-back:hover{color:var(--ink);}
.cpd-title{font-family:var(--display);font-weight:600;font-size:1.9rem;letter-spacing:-.02em;margin:0 0 22px;}
.cpd-error{color:#DC2626;font-size:.88rem;margin:0 0 16px;}

.cpd-card{background:var(--panel);border:1px solid var(--rail);border-radius:16px;padding:22px;margin-bottom:16px;}
.cpd-card-title{font-family:var(--display);font-weight:600;font-size:1.05rem;letter-spacing:-.01em;margin:0 0 16px;}
.cpd-nomargin{margin:0;}
.cpd-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
.cpd-addbtn{font-family:var(--body);font-size:.88rem;font-weight:600;cursor:pointer;background:var(--paper);color:var(--ink);border:1px solid var(--rail);border-radius:999px;padding:8px 16px;transition:all .2s;}
.cpd-addbtn:hover{border-color:var(--ink);}

.cpd-label{display:block;font-size:.82rem;font-weight:600;color:var(--ink);margin:0 0 6px;}
.cpd-req{color:var(--brand);}
.cpd-field{width:100%;font-family:var(--body);font-size:.95rem;color:var(--ink);background:var(--paper);border:1px solid var(--rail);border-radius:11px;padding:11px 13px;margin-bottom:16px;transition:border-color .2s,box-shadow .2s;}
.cpd-field::placeholder{color:#A0A6B0;}
.cpd-field:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft);}
.cpd-textarea{resize:vertical;line-height:1.5;}
.cpd-row2{display:flex;gap:12px;}
.cpd-row2 > div{flex:1;}
.cpd-saverow{display:flex;align-items:center;justify-content:flex-end;gap:14px;}
.cpd-saved{color:var(--goal);font-size:.85rem;}
.cpd-save{font-family:var(--body);font-size:.92rem;font-weight:600;cursor:pointer;background:var(--ink);color:var(--paper);border:none;border-radius:999px;padding:11px 22px;transition:background .2s,transform .1s;}
.cpd-save:hover{background:var(--brand);}
.cpd-save:disabled{opacity:.5;cursor:default;}

.cpd-contacts{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
.cpd-contact{display:flex;align-items:stretch;gap:8px;background:var(--paper);border:1px solid var(--rail);border-radius:11px;overflow:hidden;}
.cpd-contact-main{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:1px;text-align:left;cursor:pointer;background:none;border:none;padding:11px 14px;transition:background .15s;}
.cpd-contact-main:hover{background:rgba(79,70,229,.05);}
.cpd-contact-name{font-weight:600;font-size:.95rem;color:var(--ink);}
.cpd-contact-role{font-size:.82rem;color:var(--muted);}
.cpd-contact-coords{font-size:.82rem;color:var(--muted);font-family:var(--mono);}
.cpd-contact-note{font-size:.82rem;color:var(--muted);font-style:italic;margin-top:3px;}
.cpd-contact-del{background:none;border:none;cursor:pointer;color:#B6BBC4;font-size:.9rem;padding:0 12px;transition:all .2s;}
.cpd-contact-del:hover{color:#DC2626;background:rgba(220,38,38,.08);}

.cpd-apps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
.cpd-app{display:flex;align-items:center;justify-content:space-between;gap:12px;text-decoration:none;color:var(--ink);background:var(--paper);border:1px solid var(--rail);border-radius:11px;padding:11px 14px;font-size:.95rem;transition:border-color .2s;}
.cpd-app:hover{border-color:#C4C8D0;}
.cpd-app-badge{display:inline-flex;align-items:center;gap:6px;font-size:.8rem;color:var(--muted);white-space:nowrap;}
.cpd-app-dot{width:8px;height:8px;border-radius:50%;}

.cpd-overlay{position:fixed;inset:0;z-index:50;background:rgba(22,24,29,.45);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:20px;animation:cpdFade .15s ease;}
.cpd-modal{width:100%;max-width:480px;background:var(--panel);border:1px solid var(--rail);border-radius:20px;padding:26px;box-shadow:0 40px 80px -24px rgba(22,24,29,.4);animation:cpdPop .18s ease;max-height:90vh;overflow-y:auto;}
.cpd-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
.cpd-modal-title{font-family:var(--display);font-weight:600;font-size:1.3rem;letter-spacing:-.01em;margin:0;}
.cpd-close{background:none;border:none;cursor:pointer;color:var(--muted);font-size:1rem;padding:6px;border-radius:8px;transition:all .2s;}
.cpd-close:hover{color:var(--ink);background:rgba(22,24,29,.06);}
.cpd-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:8px;}
.cpd-cancel{font-family:var(--body);font-size:.92rem;font-weight:600;cursor:pointer;background:transparent;color:var(--ink);border:1px solid var(--rail);border-radius:999px;padding:11px 20px;transition:border-color .2s;}
.cpd-cancel:hover{border-color:var(--ink);}
.cpd-submit{font-family:var(--body);font-size:.92rem;font-weight:600;cursor:pointer;background:var(--ink);color:var(--paper);border:none;border-radius:999px;padding:11px 22px;transition:background .2s,transform .1s;}
.cpd-submit:hover{background:var(--brand);}
.cpd-submit:disabled{opacity:.5;cursor:default;}

@keyframes cpdFade{from{opacity:0;}to{opacity:1;}}
@keyframes cpdPop{from{opacity:0;transform:translateY(8px) scale(.98);}to{opacity:1;transform:none;}}

@media (max-width:520px){.cpd-row2{flex-direction:column;gap:0;}}
`