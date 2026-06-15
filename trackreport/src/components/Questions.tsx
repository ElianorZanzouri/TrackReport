import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { db, type Interview } from '../db'
import { localInsert, localUpdate, localDelete } from '../sync'

type Props = { user: User }

const CATEGORY_SUGGESTIONS = [
  'Technical',
  'Behavioral',
  'HR',
  'Company culture',
  'Logic',
  'Case study',
]

export default function Questions({ user }: Props) {
  const [list, setList] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')

  // Modale
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  // Read from the LOCAL database (Dexie): instant and available offline.
  async function load() {
    try {
      const rows = await db.interview.toArray()
      rows.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      setList(rows)
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

  function resetForm() {
    setEditingId(null)
    setQuestion('')
    setAnswer('')
    setCategory('')
    setTags([])
    setTagInput('')
  }
  function openAdd() {
    resetForm()
    setOpen(true)
  }
  function openEdit(q: Interview) {
    setEditingId(q.id)
    setQuestion(q.question)
    setAnswer(q.answer ?? '')
    setCategory(q.category ?? '')
    setTags(q.tags ?? [])
    setTagInput('')
    setOpen(true)
  }
  function closeModal() {
    setOpen(false)
  }

  function addTag(value: string) {
    const t = value.trim()
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setTagInput('')
  }
  function handleTagKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags((prev) => prev.slice(0, -1))
    }
  }
  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim()) return
    setSaving(true)
    setError(null)

    const finalTags = tagInput.trim()
      ? Array.from(new Set([...tags, tagInput.trim()]))
      : tags

    const fields = {
      question: question.trim(),
      answer: answer.trim() || null,
      category: category.trim() || null,
      tags: finalTags.length ? finalTags : null,
    }

    try {
      if (editingId) {
        // Update: local + queued write
        await localUpdate('interview', editingId, fields)
      } else {
        // Add: generate a client-side ID (stable, offline)
        const row: Interview = {
          id: crypto.randomUUID(),
          user_id: user.id,
          created_at: new Date().toISOString(),
          ...fields,
        }
        await localInsert('interview', row)
      }
      closeModal()
      await load()
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this question?')) return
    try {
      await localDelete('interview', id)
      setList((prev) => prev.filter((q) => q.id !== id))
    } catch (e: any) {
      setError(e.message ?? String(e))
    }
  }

  const categories = Array.from(
    new Set(list.map((q) => q.category).filter(Boolean))
  ) as string[]

  const filtered = list.filter((q) => {
    const needle = search.trim().toLowerCase()
    const haystack = [
      q.question,
      q.answer ?? '',
      q.category ?? '',
      (q.tags ?? []).join(' '),
    ]
      .join(' ')
      .toLowerCase()
    const matchText = !needle || haystack.includes(needle)
    const matchCat = catFilter === 'all' || q.category === catFilter
    return matchText && matchCat
  })

  return (
    <div className="qst-page">
      <style>{CSS}</style>

      <div className="qst-head">
        <div>
          <p className="qst-eyebrow">Preparation</p>
          <h1 className="qst-title">Interview questions</h1>
        </div>
        <button className="qst-new" onClick={openAdd}>
          + New question
        </button>
      </div>

      {list.length > 0 && (
        <div className="qst-filters">
          <input
            className="qst-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search (question, answer, category, tag)…"
          />
          {categories.length > 0 && (
            <select
              className="qst-catfilter"
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
            >
              <option value="all">All topics</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {error && <p className="qst-error">{error}</p>}

      {loading ? (
        <p className="qst-muted">Loading…</p>
      ) : list.length === 0 ? (
        <p className="qst-muted">
          Your bank is empty. Add interview questions you encountered and your answers to prepare.
        </p>
      ) : filtered.length === 0 ? (
        <p className="qst-muted">No questions match these filters.</p>
      ) : (
        <ul className="qst-list">
          {filtered.map((q) => (
            <li key={q.id} className="qst-card">
              <button className="qst-card-main" onClick={() => openEdit(q)}>
                <span className="qst-q">{q.question}</span>
                {(q.category || (q.tags && q.tags.length > 0)) && (
                  <span className="qst-tagrow">
                    {q.category && <span className="qst-cat">{q.category}</span>}
                    {(q.tags ?? []).map((t) => (
                      <span key={t} className="qst-tag">
                        {t}
                      </span>
                    ))}
                  </span>
                )}
                {q.answer && <span className="qst-a">{q.answer}</span>}
              </button>
              <button
                className="qst-del"
                onClick={() => handleDelete(q.id)}
                aria-label="Delete"
                title="Delete"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div
          className="qst-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div className="qst-modal" role="dialog" aria-modal="true">
            <div className="qst-modal-head">
              <h2 className="qst-modal-title">
                {editingId ? 'Edit question' : 'New question'}
              </h2>
              <button className="qst-close" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>
            <form onSubmit={handleSave}>
              <label className="qst-label">
                Question <span className="qst-req">*</span>
              </label>
              <textarea
                className="qst-field qst-textarea"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Tell me about a project you're proud of."
                rows={2}
                autoFocus
              />

              <label className="qst-label">Category</label>
              <input
                className="qst-field"
                list="qst-categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Technical, HR, behavioral…"
              />
              <datalist id="qst-categories">
                {CATEGORY_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>

              <label className="qst-label">Tags</label>
              <div className="qst-taginput">
                {tags.map((t) => (
                  <span key={t} className="qst-chip">
                    {t}
                    <button
                      type="button"
                      className="qst-chip-x"
                      onClick={() => removeTag(t)}
                      aria-label={`Remove ${t}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <input
                  className="qst-chipfield"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKey}
                  placeholder={tags.length ? '' : 'Add a tag, Enter to confirm'}
                />
              </div>

              <label className="qst-label">Your answer</label>
              <textarea
                className="qst-field qst-textarea"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Note your prepared answer, points not to remember…"
                rows={5}
              />

              <div className="qst-actions">
                <button type="button" className="qst-cancel" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="qst-submit"
                  disabled={saving || !question.trim()}
                >
                  {saving ? 'Saving…' : editingId ? 'Save' : 'Add'}
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
.qst-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:24px;flex-wrap:wrap;}
.qst-eyebrow{font-family:var(--mono);font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--brand);margin:6px 0 8px;}
.qst-title{font-family:var(--display);font-weight:700;font-size:2rem;letter-spacing:-.02em;margin:0;}
.qst-muted{color:var(--muted);}
.qst-error{color:var(--danger);font-size:.88rem;margin:0 0 18px;}

.qst-new{font-family:var(--body);font-size:.92rem;font-weight:700;cursor:pointer;background:var(--brand);color:#fff;border:none;border-radius:999px;padding:12px 22px;transition:background .2s,transform .1s;}
.qst-new:hover{background:#3730A3;}
.qst-new:active{transform:translateY(1px);}

.qst-filters{display:grid;gap:14px;margin-bottom:24px;grid-template-columns:1fr 200px;}
.qst-search{font-family:var(--body);font-size:.95rem;color:var(--text);background:var(--surface);border:1px solid var(--surface-strong);border-radius:18px;padding:14px 16px;transition:border-color .2s,box-shadow .2s;}
.qst-search::placeholder{color:#9CA3AF;}
.qst-search:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px rgba(79,70,229,.12);}
.qst-catfilter{font-family:var(--body);font-size:.95rem;color:var(--text);background:var(--surface);border:1px solid var(--surface-strong);border-radius:18px;padding:14px 16px;cursor:pointer;}
.qst-catfilter:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px rgba(79,70,229,.12);}

.qst-list{list-style:none;margin:0;padding:0;display:grid;gap:14px;}
.qst-card{display:flex;align-items:stretch;gap:10px;background:var(--surface);border:1px solid var(--surface-strong);border-radius:22px;overflow:hidden;box-shadow:var(--shadow);transition:border-color .2s;}
.qst-card:hover{border-color:rgba(79,70,229,.22);}
.qst-card-main{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:10px;text-align:left;cursor:pointer;background:none;border:none;padding:18px 20px;transition:background .15s;}
.qst-card-main:hover{background:rgba(79,70,229,.05);}
.qst-q{font-family:var(--display);font-weight:700;font-size:1.02rem;color:var(--text);letter-spacing:-.01em;}
.qst-tagrow{display:flex;flex-wrap:wrap;gap:8px;}
.qst-cat{font-size:.72rem;font-weight:700;color:var(--brand);background:rgba(79,70,229,.1);border-radius:999px;padding:4px 12px;}
.qst-tag{font-size:.72rem;color:var(--muted);background:var(--surface);border:1px solid var(--surface-strong);border-radius:999px;padding:4px 10px;}
.qst-a{font-size:.94rem;line-height:1.7;color:var(--muted);white-space:pre-wrap;}
.qst-del{background:none;border:none;cursor:pointer;color:#9CA3AF;font-size:1rem;padding:12px 16px;transition:all .2s;}
.qst-del:hover{color:var(--danger);background:rgba(220,38,38,.1);}

.qst-overlay{position:fixed;inset:0;z-index:50;background:rgba(15,23,42,.42);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:20px;animation:qstFade .18s ease;}
.qst-modal{width:100%;max-width:560px;background:var(--surface);border:1px solid var(--surface-strong);border-radius:28px;padding:28px;box-shadow:0 40px 80px rgba(15,23,42,.14);animation:qstPop .18s ease;max-height:90vh;overflow-y:auto;}
.qst-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;}
.qst-modal-title{font-family:var(--display);font-weight:700;font-size:1.3rem;letter-spacing:-.01em;margin:0;}
.qst-close{background:none;border:none;cursor:pointer;color:var(--muted);font-size:1rem;padding:8px;border-radius:12px;transition:all .2s;}
.qst-close:hover{color:var(--text);background:rgba(15,23,42,.06);}
.qst-label{display:block;font-size:.84rem;font-weight:700;color:var(--text);margin:0 0 8px;}
.qst-req{color:var(--brand);}
.qst-field{width:100%;font-family:var(--body);font-size:.95rem;color:var(--text);background:var(--surface);border:1px solid var(--surface-strong);border-radius:18px;padding:14px 16px;margin-bottom:18px;transition:border-color .2s,box-shadow .2s;}
.qst-field::placeholder{color:#9CA3AF;}
.qst-field:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px rgba(79,70,229,.12);}
.qst-textarea{resize:vertical;line-height:1.7;}

.qst-taginput{display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:var(--surface);border:1px solid var(--surface-strong);border-radius:18px;padding:10px 12px;margin-bottom:18px;}
.qst-taginput:focus-within{border-color:var(--brand);box-shadow:0 0 0 4px rgba(79,70,229,.12);}
.qst-chip{display:inline-flex;align-items:center;gap:8px;font-size:.85rem;color:var(--text);background:var(--surface);border:1px solid var(--surface-strong);border-radius:999px;padding:6px 10px;}
.qst-chip-x{background:none;border:none;cursor:pointer;color:#9CA3AF;font-size:.8rem;padding:1px 4px;border-radius:50%;line-height:1;}
.qst-chip-x:hover{color:var(--danger);}
.qst-chipfield{flex:1;min-width:140px;border:none;outline:none;background:none;font-family:var(--body);font-size:.95rem;color:var(--text);padding:6px 4px;}
.qst-chipfield::placeholder{color:#9CA3AF;}

.qst-actions{display:flex;justify-content:flex-end;gap:12px;margin-top:10px;}
.qst-cancel{font-family:var(--body);font-size:.92rem;font-weight:700;cursor:pointer;background:transparent;color:var(--text);border:1px solid var(--surface-strong);border-radius:999px;padding:12px 22px;transition:all .2s;}
.qst-cancel:hover{background:var(--surface-soft);}
.qst-submit{font-family:var(--body);font-size:.92rem;font-weight:700;cursor:pointer;background:var(--brand);color:#fff;border:none;border-radius:999px;padding:12px 24px;transition:background .2s;}
.qst-submit:hover{background:#3730A3;}
.qst-submit:disabled{opacity:.55;cursor:default;}

@keyframes qstFade{from{opacity:0;}to{opacity:1;}}
@keyframes qstPop{from{opacity:0;transform:translateY(10px) scale(.98);}to{opacity:1;transform:none;}}
`