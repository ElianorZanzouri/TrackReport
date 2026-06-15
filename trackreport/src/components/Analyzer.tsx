import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import { localInsert } from '../sync'

type Analysis = {
  score: number
  summary: string
  strengths: string[]
  gaps: string[]
  questions: string[]
  advice: string[]
}

type Props = {
  user: User
  initialJobDescription?: string
  // If provided, questions added to the bank will be tagged with this name.
  companyName?: string | null
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

export default function Analyzer({
  user,
  initialJobDescription = '',
  companyName = null,
}: Props) {
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [jobDesc, setJobDesc] = useState(initialJobDescription)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Analysis | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    if (!cvFile || !jobDesc.trim()) return
    if (!navigator.onLine) {
      setError('AI analysis requires an internet connection.')
      return
    }
    setAnalyzing(true)
    setError(null)
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
      setError(e.message ?? String(e))
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
        category: 'Interview',
        tags: companyName ? [companyName] : null,
        created_at: new Date().toISOString(),
      })
      setAdded((prev) => new Set(prev).add(qText))
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
  }

  return (
    <>
      <style>{CSS}</style>

      <form className="cva-form" onSubmit={handleAnalyze}>
<label className="cva-label">Your CV (PDF)</label>
      <input
        className="cva-file"
        type="file"
        accept="application/pdf"
        onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
      />

      <label className="cva-label">Job description</label>
      <textarea
        className="cva-textarea"
        value={jobDesc}
        onChange={(e) => setJobDesc(e.target.value)}
        rows={6}
        placeholder="Paste the full job description here…"
        />

        {!online && (
          <p className="cva-offline">
            You are offline — AI analysis will be available once connection returns.
          </p>
        )}

        <div className="cva-actions">
          <button
            type="submit"
            className="cva-run"
            disabled={analyzing || !cvFile || !jobDesc.trim() || !online}
          >
            {analyzing ? 'Analyzing…' : 'Run analysis'}
          </button>
        </div>
      </form>

      {error && <p className="cva-error">{error}</p>}

      {result && (
        <div className="cva-result">
          <div className="cva-score-row">
            <div className="cva-score" style={{ color: scoreColor(result.score) }}>
              {result.score}
              <span className="cva-score-max">/100</span>
            </div>
            <p className="cva-summary">{result.summary}</p>
          </div>

          {result.strengths?.length > 0 && (
            <div className="cva-block">
              <h3 className="cva-block-title">Strengths</h3>
              <ul className="cva-list">
                {result.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {result.gaps?.length > 0 && (
            <div className="cva-block">
              <h3 className="cva-block-title">Gaps to fill</h3>
              <ul className="cva-list">
                {result.gaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}

          {result.questions?.length > 0 && (
            <div className="cva-block">
              <h3 className="cva-block-title">Likely questions</h3>
              <ul className="cva-qlist">
                {result.questions.map((q, i) => (
                  <li key={i} className="cva-qitem">
                    <span>{q}</span>
                    {added.has(q) ? (
                      <span className="cva-added">✓ Added</span>
                    ) : (
                      <button className="cva-add" onClick={() => addQuestion(q)}>
                        + Add to bank
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.advice?.length > 0 && (
            <div className="cva-block">
              <h3 className="cva-block-title">Advice</h3>
              <ul className="cva-list">
                {result.advice.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="cva-disclaimer">
            AI-generated analysis — use as guidance, not absolute truth.
          </p>
        </div>
      )}
    </>
  )
}

const CSS = `
.cva-label{display:block;font-family:var(--display);font-weight:600;font-size:.82rem;color:var(--ink);margin:0 0 6px;}
.cva-file{display:block;width:100%;font-family:var(--body);font-size:.9rem;color:var(--ink);background:var(--paper);border:1px solid var(--rail);border-radius:11px;padding:10px 12px;margin-bottom:18px;}
.cva-textarea{width:100%;font-family:var(--body);font-size:.95rem;color:var(--ink);background:var(--paper);border:1px solid var(--rail);border-radius:11px;padding:11px 13px;line-height:1.5;resize:vertical;transition:border-color .2s,box-shadow .2s;}
.cva-textarea:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft);}
.cva-offline{font-size:.84rem;color:#92400E;background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:8px 12px;margin:14px 0 0;}
.cva-actions{display:flex;justify-content:flex-end;margin-top:14px;}
.cva-run{font-family:var(--body);font-size:.92rem;font-weight:600;cursor:pointer;background:var(--brand);color:#fff;border:none;border-radius:999px;padding:11px 22px;transition:filter .2s;}
.cva-run:hover{filter:brightness(1.05);}
.cva-run:disabled{opacity:.5;cursor:default;}
.cva-error{color:#DC2626;font-size:.88rem;margin:16px 0 0;}

.cva-result{margin-top:24px;border-top:1px dashed var(--rail);padding-top:22px;}
.cva-score-row{display:flex;align-items:center;gap:20px;margin-bottom:22px;flex-wrap:wrap;}
.cva-score{font-family:var(--display);font-weight:700;font-size:2.8rem;line-height:1;letter-spacing:-.02em;}
.cva-score-max{font-size:1rem;color:var(--muted);font-weight:500;margin-left:2px;}
.cva-summary{flex:1;min-width:220px;font-size:.95rem;line-height:1.55;color:var(--ink);margin:0;}
.cva-block{margin-bottom:18px;}
.cva-block-title{font-family:var(--display);font-weight:600;font-size:.95rem;margin:0 0 8px;}
.cva-list{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;}
.cva-list li{font-size:.92rem;line-height:1.5;color:var(--ink);}
.cva-qlist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
.cva-qitem{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--paper);border:1px solid var(--rail);border-radius:11px;padding:10px 14px;font-size:.92rem;}
.cva-add{font-family:var(--body);font-size:.82rem;font-weight:600;cursor:pointer;background:var(--brand-soft);color:var(--brand);border:none;border-radius:999px;padding:6px 12px;white-space:nowrap;transition:filter .2s;}
.cva-add:hover{filter:brightness(.96);}
.cva-added{font-size:.82rem;color:var(--goal);font-weight:600;white-space:nowrap;}
.cva-disclaimer{font-size:.78rem;color:var(--muted);font-style:italic;margin:18px 0 0;}
`