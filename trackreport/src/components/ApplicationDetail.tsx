import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { db, type HistoryStatus } from '../db'
import { localInsert, localUpdate } from '../sync'
import { supabase } from '../supabaseClient'
import { STATUS, statusInfo } from '../Status'

type Props = { user: User }

type AppView = {
  id: string
  position: string
  description: string | null
  status_actuel: string
  company_name: string | null
}

type Analysis = {
  score: number
  summary: string
  strengths: string[]
  gaps: string[]
  questions: string[]
  advice: string[]
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      const res = r.result as string
      resolve(res.slice(res.indexOf(',') + 1))
    }
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

function scoreColor(s: number) {
  return s >= 75 ? '#15A34A' : s >= 50 ? '#F59E0B' : '#DC2626'
}

export default function ApplicationDetail({ user }: Props) {
  const { id } = useParams()
  const [app, setApp] = useState<AppView | null>(null)
  const [history, setHistory] = useState<HistoryStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newStatus, setNewStatus] = useState('applied')
  const [reason, setReason] = useState('')
  const [updating, setUpdating] = useState(false)

  // --- AI analysis ---
  const [showAnalyze, setShowAnalyze] = useState(false)
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [jobDesc, setJobDesc] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [result, setResult] = useState<Analysis | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())

  async function load() {
    if (!id) return
    try {
      const a = await db.applications.get(id)
      if (!a) {
        setApp(null)
        setLoading(false)
        return
      }
      let companyName: string | null = null
      if (a.company_id) {
        const c = await db.companies.get(a.company_id)
        companyName = c?.company_name ?? null
      }
      setApp({
        id: a.id,
        position: a.position,
        description: a.description,
        status_actuel: a.status_actuel,
        company_name: companyName,
      })
      setNewStatus(a.status_actuel)
      setJobDesc(a.description ?? '')

      const hist = await db.histories_status.where('application_id').equals(id).toArray()
      hist.sort((x, y) => y.date_updated.localeCompare(x.date_updated))
      setHistory(hist)
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
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
    try {
      const nowISO = new Date().toISOString()
      await localInsert('histories_status', {
        id: crypto.randomUUID(),
        user_id: user.id,
        application_id: id,
        status: newStatus,
        date_updated: nowISO,
        reason: reason.trim() || null,
      })
      await localUpdate('applications', id, {
        status_actuel: newStatus,
        date_update: nowISO.slice(0, 10),
      })
      setReason('')
      await load()
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
    setUpdating(false)
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    if (!cvFile || !jobDesc.trim()) return
    setAnalyzing(true)
    setAnalyzeError(null)
    setResult(null)
    setAdded(new Set())
    try {
      const cvBase64 = await fileToBase64(cvFile)
      const { data, error } = await supabase.functions.invoke('analyze-cv', {
        body: {
          jobDescription: jobDesc.trim(),
          cvBase64,
          cvMimeType: cvFile.type || 'application/pdf',
        },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.detail || data.error)
      setResult(data as Analysis)
    } catch (e: any) {
      setAnalyzeError(e.message ?? String(e))
    }
    setAnalyzing(false)
  }

  async function addQuestion(qText: string) {
    try {
      await localInsert('interview', {
        id: crypto.randomUUID(),
        user_id: user.id,
        question: qText,
        answer: null,
        category: 'Entretien',
        tags: app?.company_name ? [app.company_name] : null,
        created_at: new Date().toISOString(),
      })
      setAdded((prev) => new Set(prev).add(qText))
    } catch (e: any) {
      setAnalyzeError(e.message ?? String(e))
    }
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
          <p className="apd-meta">{app.company_name ?? 'Company not specified'}</p>
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

      {/* ---------- AI analysis ---------- */}
      <div className="apd-card ai-card">
        <div className="ai-head">
          <div>
            <h2 className="apd-card-title ai-nomargin">AI analysis</h2>
            <p className="ai-sub">
              Compare your CV to this job: match, strengths, gaps, likely questions.
            </p>
          </div>
          {!showAnalyze && (
            <button className="ai-open" onClick={() => setShowAnalyze(true)}>
              Analyze with AI
            </button>
          )}
        </div>

        {showAnalyze && (
          <form className="ai-form" onSubmit={handleAnalyze}>
            <label className="apd-card-title ai-label">Your CV (PDF)</label>
            <input
              className="ai-file"
              type="file"
              accept="application/pdf"
              onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
            />

            <label className="apd-card-title ai-label">Job description</label>
            <textarea
              className="ai-textarea"
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              rows={5}
              placeholder="Paste the full job description here…"
            />

            <div className="ai-actions">
              <button
                type="button"
                className="ai-cancel"
                onClick={() => setShowAnalyze(false)}
              >
                Close
              </button>
              <button
                type="submit"
                className="ai-run"
                disabled={analyzing || !cvFile || !jobDesc.trim()}
              >
                {analyzing ? 'Analyzing…' : 'Run analysis'}
              </button>
            </div>
          </form>
        )}

        {analyzeError && <p className="apd-error ai-mt">{analyzeError}</p>}

        {result && (
          <div className="ai-result">
            <div className="ai-score-row">
              <div className="ai-score" style={{ color: scoreColor(result.score) }}>
                {result.score}
                <span className="ai-score-max">/100</span>
              </div>
              <p className="ai-summary">{result.summary}</p>
            </div>

            {result.strengths?.length > 0 && (
              <div className="ai-block">
                <h3 className="ai-block-title">Strengths</h3>
                <ul className="ai-list">
                  {result.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.gaps?.length > 0 && (
              <div className="ai-block">
                <h3 className="ai-block-title">Gaps to close</h3>
                <ul className="ai-list">
                  {result.gaps.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.questions?.length > 0 && (
              <div className="ai-block">
                <h3 className="ai-block-title">Likely questions</h3>
                <ul className="ai-qlist">
                  {result.questions.map((q, i) => (
                    <li key={i} className="ai-qitem">
                      <span>{q}</span>
                      {added.has(q) ? (
                        <span className="ai-added">✓ Added</span>
                      ) : (
                        <button className="ai-add" onClick={() => addQuestion(q)}>
                          + Add to bank
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.advice?.length > 0 && (
              <div className="ai-block">
                <h3 className="ai-block-title">Advice</h3>
                <ul className="ai-list">
                  {result.advice.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="ai-disclaimer">
              AI-generated analysis — use it as guidance, not absolute truth.
            </p>
          </div>
        )}
      </div>

      {/* ---------- Status ---------- */}
      <div className="apd-card">
        <h2 className="apd-card-title">Update status</h2>
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

      {/* ---------- History ---------- */}
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
                      {new Date(h.date_updated).toLocaleString('fr-FR', {
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

/* ---- Analyse IA ---- */
.ai-card{border-color:var(--brand-soft);}
.ai-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.ai-nomargin{margin:0 0 4px;}
.ai-sub{font-size:.86rem;color:var(--muted);margin:0;max-width:42ch;}
.ai-open{font-family:var(--body);font-size:.92rem;font-weight:600;cursor:pointer;background:var(--brand);color:#fff;border:none;border-radius:999px;padding:11px 20px;transition:filter .2s;white-space:nowrap;}
.ai-open:hover{filter:brightness(1.05);}

.ai-form{margin-top:18px;}
.ai-label{font-size:.82rem !important;margin:0 0 6px !important;}
.ai-file{display:block;width:100%;font-family:var(--body);font-size:.9rem;color:var(--ink);background:var(--paper);border:1px solid var(--rail);border-radius:11px;padding:10px 12px;margin-bottom:18px;}
.ai-textarea{width:100%;font-family:var(--body);font-size:.95rem;color:var(--ink);background:var(--paper);border:1px solid var(--rail);border-radius:11px;padding:11px 13px;line-height:1.5;resize:vertical;transition:border-color .2s,box-shadow .2s;}
.ai-textarea:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft);}
.ai-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:14px;}
.ai-cancel{font-family:var(--body);font-size:.92rem;font-weight:600;cursor:pointer;background:transparent;color:var(--ink);border:1px solid var(--rail);border-radius:999px;padding:11px 20px;transition:border-color .2s;}
.ai-cancel:hover{border-color:var(--ink);}
.ai-run{font-family:var(--body);font-size:.92rem;font-weight:600;cursor:pointer;background:var(--ink);color:#fff;border:none;border-radius:999px;padding:11px 22px;transition:background .2s;}
.ai-run:hover{background:var(--brand);}
.ai-run:disabled{opacity:.5;cursor:default;}
.ai-mt{margin-top:16px;}

.ai-result{margin-top:22px;border-top:1px dashed var(--rail);padding-top:20px;}
.ai-score-row{display:flex;align-items:center;gap:20px;margin-bottom:20px;flex-wrap:wrap;}
.ai-score{font-family:var(--display);font-weight:700;font-size:2.8rem;line-height:1;letter-spacing:-.02em;}
.ai-score-max{font-size:1rem;color:var(--muted);font-weight:500;margin-left:2px;}
.ai-summary{flex:1;min-width:220px;font-size:.95rem;line-height:1.55;color:var(--ink);margin:0;}
.ai-block{margin-bottom:18px;}
.ai-block-title{font-family:var(--display);font-weight:600;font-size:.95rem;margin:0 0 8px;}
.ai-list{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;}
.ai-list li{font-size:.92rem;line-height:1.5;color:var(--ink);}
.ai-qlist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
.ai-qitem{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--paper);border:1px solid var(--rail);border-radius:11px;padding:10px 14px;font-size:.92rem;}
.ai-add{font-family:var(--body);font-size:.82rem;font-weight:600;cursor:pointer;background:var(--brand-soft);color:var(--brand);border:none;border-radius:999px;padding:6px 12px;white-space:nowrap;transition:filter .2s;}
.ai-add:hover{filter:brightness(.96);}
.ai-added{font-size:.82rem;color:var(--goal);font-weight:600;white-space:nowrap;}
.ai-disclaimer{font-size:.78rem;color:var(--muted);font-style:italic;margin:18px 0 0;}
`