import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import { STATUS, statusInfo } from '../Status'

type Props = { user: User }

type Application = {
  id: string
  position: string
  description: string | null
  status_actuel: string
  date_update: string | null
  companies: { company_name: string } | null
}

type HistoryRow = {
  id: string
  status: string
  date_updated: string
  reason: string | null
}

export default function ApplicationDetail({ user }: Props) {
  const { id } = useParams()
  const [app, setApp] = useState<Application | null>(null)
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Status change form
  const [newStatus, setNewStatus] = useState('applied')
  const [reason, setReason] = useState('')
  const [updating, setUpdating] = useState(false)

  async function load() {
    if (!id) return

    const { data: appData, error: appErr } = await supabase
      .from('applications')
      .select('id, position, description, status_actuel, date_update, companies(company_name)')
      .eq('id', id)
      .maybeSingle()

    if (appErr) {
      setError(appErr.message)
      setLoading(false)
      return
    }

    const application = appData as unknown as Application | null
    setApp(application)
    if (application) setNewStatus(application.status_actuel)

    const { data: hist, error: histErr } = await supabase
      .from('histories_status')
      .select('id, status, date_updated, reason')
      .eq('application_id', id)
      .order('date_updated', { ascending: false })

    if (histErr) setError(histErr.message)
    else setHistory((hist as HistoryRow[]) ?? [])

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  async function handleUpdateStatus(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    setUpdating(true)
    setError(null)

    // 1. New history entry
    const { error: histErr } = await supabase.from('histories_status').insert({
      user_id: user.id,
      application_id: id,
      status: newStatus,
      reason: reason.trim() || null,
    })

    if (histErr) {
      setError(histErr.message)
      setUpdating(false)
      return
    }

    // 2. Update current status + date on the application
    const today = new Date().toISOString().slice(0, 10)
    const { error: updErr } = await supabase
      .from('applications')
      .update({ status_actuel: newStatus, date_update: today })
      .eq('id', id)

    if (updErr) setError(updErr.message)

    setReason('')
    await load()
    setUpdating(false)
  }

  if (loading) {
    return (
      <div className="apd-page">
        <style>{CSS}</style>
        <p className="apd-muted">Loading…</p>
      </div>
    )
  }

  if (!app) {
    return (
      <div className="apd-page">
        <style>{CSS}</style>
        <Link to="/" className="apd-back">← All applications</Link>
        <p className="apd-muted">Application not found.</p>
      </div>
    )
  }

  const current = statusInfo(app.status_actuel)

  return (
    <div className="apd-page">
      <style>{CSS}</style>

      <Link to="/" className="apd-back">← All applications</Link>

      <div className="apd-header">
        <div>
          <h1 className="apd-title">{app.position}</h1>
          <p className="apd-meta">
            {app.companies?.company_name ?? 'Company not specified'}
          </p>
        </div>
        <span className="apd-badge">
          <span className="apd-badge-dot" style={{ background: current.color }} />
          {current.label}
        </span>
      </div>

      {app.description && (
        <div className="apd-card">
          <h2 className="apd-card-title">Job description</h2>
          <p className="apd-desc">{app.description}</p>
        </div>
      )}

      {error && <p className="apd-error">{error}</p>}

      {/* Change status */}
      <div className="apd-card">
        <h2 className="apd-card-title">Change status</h2>
        <form className="apd-statusform" onSubmit={handleUpdateStatus}>
          <select
            className="apd-select"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
          >
            {Object.entries(STATUS).map(([value, s]) => (
              <option key={value} value={value}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            className="apd-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason / note (optional)"
          />
          <button className="apd-update" type="submit" disabled={updating}>
            {updating ? '…' : 'Update'}
          </button>
        </form>
      </div>

      {/* Historique */}
      <div className="apd-card">
        <h2 className="apd-card-title">History</h2>
        {history.length === 0 ? (
          <p className="apd-muted">No changes recorded yet.</p>
        ) : (
          <ol className="apd-timeline">
            {history.map((h) => {
              const st = statusInfo(h.status)
              return (
                <li key={h.id} className="apd-event">
                  <span className="apd-event-dot" style={{ background: st.color }} />
                  <div className="apd-event-body">
                    <span className="apd-event-label">{st.label}</span>
                    <span className="apd-event-date">
                      {new Date(h.date_updated).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                    {h.reason && <span className="apd-event-reason">{h.reason}</span>}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}

const CSS = `
.apd-muted{color:var(--muted);}
.apd-back{display:inline-block;text-decoration:none;color:var(--muted);font-size:.9rem;margin:8px 0 20px;transition:color .2s;}
.apd-back:hover{color:var(--ink);}

.apd-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:24px;flex-wrap:wrap;}
.apd-title{font-family:var(--display);font-weight:600;font-size:1.9rem;letter-spacing:-.02em;margin:0 0 4px;}
.apd-meta{color:var(--muted);margin:0;}
.apd-badge{display:inline-flex;align-items:center;gap:7px;white-space:nowrap;font-size:.85rem;font-weight:500;color:var(--ink);background:var(--panel);border:1px solid var(--rail);border-radius:999px;padding:6px 14px;}
.apd-badge-dot{width:9px;height:9px;border-radius:50%;display:inline-block;}

.apd-card{background:var(--panel);border:1px solid var(--rail);border-radius:16px;padding:22px;margin-bottom:16px;}
.apd-card-title{font-family:var(--display);font-weight:600;font-size:1.05rem;letter-spacing:-.01em;margin:0 0 14px;}
.apd-desc{font-size:.95rem;line-height:1.6;color:var(--ink);margin:0;white-space:pre-wrap;}
.apd-error{color:#DC2626;font-size:.88rem;margin:0 0 16px;}

.apd-statusform{display:flex;gap:10px;flex-wrap:wrap;}
.apd-select{font-family:var(--body);font-size:.95rem;color:var(--ink);background:var(--paper);border:1px solid var(--rail);border-radius:11px;padding:11px 13px;cursor:pointer;}
.apd-select:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft);}
.apd-reason{flex:1;min-width:180px;font-family:var(--body);font-size:.95rem;color:var(--ink);background:var(--paper);border:1px solid var(--rail);border-radius:11px;padding:11px 13px;transition:border-color .2s,box-shadow .2s;}
.apd-reason::placeholder{color:#A0A6B0;}
.apd-reason:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft);}
.apd-update{font-family:var(--body);font-size:.92rem;font-weight:600;cursor:pointer;background:var(--ink);color:var(--paper);border:none;border-radius:11px;padding:11px 20px;transition:background .2s,transform .1s;}
.apd-update:hover{background:var(--brand);}
.apd-update:active{transform:translateY(1px);}
.apd-update:disabled{opacity:.5;cursor:default;}

.apd-timeline{list-style:none;margin:0;padding:0;}
.apd-event{position:relative;display:grid;grid-template-columns:24px 1fr;gap:4px;padding-bottom:18px;}
.apd-event::before{content:'';position:absolute;left:7px;top:16px;bottom:-2px;width:2px;background:var(--rail);}
.apd-event:last-child{padding-bottom:0;}
.apd-event:last-child::before{display:none;}
.apd-event-dot{width:14px;height:14px;border-radius:50%;margin-left:1px;margin-top:2px;z-index:1;border:2px solid var(--panel);}
.apd-event-body{display:flex;flex-direction:column;line-height:1.35;}
.apd-event-label{font-weight:600;font-size:.95rem;}
.apd-event-date{font-family:var(--mono);font-size:.72rem;color:var(--muted);margin-top:1px;}
.apd-event-reason{font-size:.88rem;color:var(--muted);margin-top:4px;font-style:italic;}
`