import type { User } from '@supabase/supabase-js'
import Analyzer from './Analyzer'

type Props = { user: User }

export default function Analysis({ user }: Props) {
  return (
    <div className="ana-page">
      <style>{CSS}</style>

      <p className="ana-eyebrow">Tool</p>
      <h1 className="ana-title">AI Analysis</h1>
      <p className="ana-intro">
        Compare a CV to a job posting: fit, strengths, gaps, likely questions,
        and advice. Ideal before applying or preparing for an interview.
      </p>

      <div className="ana-card">
        <Analyzer user={user} />
      </div>
    </div>
  )
}

const CSS = `
.ana-eyebrow{font-family:var(--mono);font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--brand);margin:8px 0 6px;}
.ana-title{font-family:var(--display);font-weight:600;font-size:2rem;letter-spacing:-.02em;margin:0 0 8px;}
.ana-intro{color:var(--muted);font-size:.95rem;line-height:1.55;max-width:54ch;margin:0 0 24px;}
.ana-card{background:var(--panel);border:1px solid var(--rail);border-radius:16px;padding:24px;}
`