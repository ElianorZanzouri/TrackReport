import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { db, type Interview } from '../db'
import { localInsert, localUpdate, localDelete } from '../sync'

type Props = { user: User }

const CATEGORY_SUGGESTIONS = [
  'Technique',
  'Comportemental',
  'RH',
  'Culture d’entreprise',
  'Logique',
  'Mise en situation',
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

  // Lecture depuis la base LOCALE (Dexie) : instantané et disponible hors ligne.
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
        // Modification : en local + file d'attente
        await localUpdate('interview', editingId, fields)
      } else {
        // Ajout : on génère un identifiant côté client (stable, hors ligne)
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
    if (!confirm('Supprimer cette question ?')) return
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
          <p className="qst-eyebrow">Préparation</p>
          <h1 className="qst-title">Questions d’entretien</h1>
        </div>
        <button className="qst-new" onClick={openAdd}>
          + Nouvelle question
        </button>
      </div>

      {list.length > 0 && (
        <div className="qst-filters">
          <input
            className="qst-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (question, réponse, thème, tag)…"
          />
          {categories.length > 0 && (
            <select
              className="qst-catfilter"
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
            >
              <option value="all">Tous les thèmes</option>
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
        <p className="qst-muted">Chargement…</p>
      ) : list.length === 0 ? (
        <p className="qst-muted">
          Votre banque est vide. Ajoutez les questions rencontrées en entretien
          et vos réponses pour vous y préparer.
        </p>
      ) : filtered.length === 0 ? (
        <p className="qst-muted">Aucune question ne correspond à ces filtres.</p>
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
          className="qst-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div className="qst-modal" role="dialog" aria-modal="true">
            <div className="qst-modal-head">
              <h2 className="qst-modal-title">
                {editingId ? 'Modifier la question' : 'Nouvelle question'}
              </h2>
              <button className="qst-close" onClick={closeModal} aria-label="Fermer">
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
                placeholder="Parlez-moi d’un projet dont vous êtes fier."
                rows={2}
                autoFocus
              />

              <label className="qst-label">Thème</label>
              <input
                className="qst-field"
                list="qst-categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Technique, RH, comportemental…"
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
                      aria-label={`Retirer ${t}`}
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
                  placeholder={tags.length ? '' : 'Ajouter un tag, Entrée pour valider'}
                />
              </div>

              <label className="qst-label">Votre réponse</label>
              <textarea
                className="qst-field qst-textarea"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Notez votre réponse préparée, les points à ne pas oublier…"
                rows={5}
              />

              <div className="qst-actions">
                <button type="button" className="qst-cancel" onClick={closeModal}>
                  Annuler
                </button>
                <button
                  type="submit"
                  className="qst-submit"
                  disabled={saving || !question.trim()}
                >
                  {saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Ajouter'}
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
.qst-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:20px;flex-wrap:wrap;}
.qst-eyebrow{font-family:var(--mono);font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--brand);margin:8px 0 6px;}
.qst-title{font-family:var(--display);font-weight:600;font-size:2rem;letter-spacing:-.02em;margin:0;}
.qst-muted{color:var(--muted);}
.qst-error{color:#DC2626;font-size:.88rem;margin:0 0 16px;}

.qst-new{font-family:var(--body);font-size:.92rem;font-weight:600;cursor:pointer;background:var(--ink);color:var(--paper);border:none;border-radius:999px;padding:11px 20px;transition:background .2s,transform .1s;}
.qst-new:hover{background:var(--brand);}
.qst-new:active{transform:translateY(1px);}

.qst-filters{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;}
.qst-search{flex:1;min-width:200px;font-family:var(--body);font-size:.92rem;color:var(--ink);background:var(--panel);border:1px solid var(--rail);border-radius:11px;padding:10px 13px;transition:border-color .2s,box-shadow .2s;}
.qst-search::placeholder{color:#A0A6B0;}
.qst-search:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft);}
.qst-catfilter{font-family:var(--body);font-size:.92rem;color:var(--ink);background:var(--panel);border:1px solid var(--rail);border-radius:11px;padding:10px 13px;cursor:pointer;}
.qst-catfilter:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft);}

.qst-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;}
.qst-card{display:flex;align-items:stretch;gap:8px;background:var(--panel);border:1px solid var(--rail);border-radius:14px;overflow:hidden;transition:border-color .2s;}
.qst-card:hover{border-color:#C4C8D0;}
.qst-card-main{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:8px;text-align:left;cursor:pointer;background:none;border:none;padding:16px 18px;transition:background .15s;}
.qst-card-main:hover{background:rgba(79,70,229,.04);}
.qst-q{font-family:var(--display);font-weight:600;font-size:1.02rem;color:var(--ink);letter-spacing:-.01em;}
.qst-tagrow{display:flex;flex-wrap:wrap;gap:6px;}
.qst-cat{font-size:.72rem;font-weight:600;color:var(--brand);background:var(--brand-soft);border-radius:999px;padding:3px 10px;}
.qst-tag{font-size:.72rem;color:var(--muted);background:var(--paper);border:1px solid var(--rail);border-radius:999px;padding:3px 10px;}
.qst-a{font-size:.92rem;line-height:1.55;color:var(--muted);white-space:pre-wrap;}
.qst-del{background:none;border:none;cursor:pointer;color:#B6BBC4;font-size:.95rem;padding:0 14px;transition:all .2s;}
.qst-del:hover{color:#DC2626;background:rgba(220,38,38,.08);}

.qst-overlay{position:fixed;inset:0;z-index:50;background:rgba(22,24,29,.45);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:20px;animation:qstFade .15s ease;}
.qst-modal{width:100%;max-width:520px;background:var(--panel);border:1px solid var(--rail);border-radius:20px;padding:26px;box-shadow:0 40px 80px -24px rgba(22,24,29,.4);animation:qstPop .18s ease;max-height:90vh;overflow-y:auto;}
.qst-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
.qst-modal-title{font-family:var(--display);font-weight:600;font-size:1.3rem;letter-spacing:-.01em;margin:0;}
.qst-close{background:none;border:none;cursor:pointer;color:var(--muted);font-size:1rem;padding:6px;border-radius:8px;transition:all .2s;}
.qst-close:hover{color:var(--ink);background:rgba(22,24,29,.06);}
.qst-label{display:block;font-size:.82rem;font-weight:600;color:var(--ink);margin:0 0 6px;}
.qst-req{color:var(--brand);}
.qst-field{width:100%;font-family:var(--body);font-size:.95rem;color:var(--ink);background:var(--paper);border:1px solid var(--rail);border-radius:11px;padding:11px 13px;margin-bottom:16px;transition:border-color .2s,box-shadow .2s;}
.qst-field::placeholder{color:#A0A6B0;}
.qst-field:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft);}
.qst-textarea{resize:vertical;line-height:1.5;}

.qst-taginput{display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:var(--paper);border:1px solid var(--rail);border-radius:11px;padding:8px 10px;margin-bottom:16px;}
.qst-taginput:focus-within{border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft);}
.qst-chip{display:inline-flex;align-items:center;gap:5px;font-size:.82rem;color:var(--ink);background:var(--panel);border:1px solid var(--rail);border-radius:999px;padding:4px 6px 4px 11px;}
.qst-chip-x{background:none;border:none;cursor:pointer;color:var(--muted);font-size:.7rem;padding:1px 3px;border-radius:50%;line-height:1;}
.qst-chip-x:hover{color:#DC2626;}
.qst-chipfield{flex:1;min-width:140px;border:none;outline:none;background:none;font-family:var(--body);font-size:.92rem;color:var(--ink);padding:5px 4px;}
.qst-chipfield::placeholder{color:#A0A6B0;}

.qst-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:8px;}
.qst-cancel{font-family:var(--body);font-size:.92rem;font-weight:600;cursor:pointer;background:transparent;color:var(--ink);border:1px solid var(--rail);border-radius:999px;padding:11px 20px;transition:border-color .2s;}
.qst-cancel:hover{border-color:var(--ink);}
.qst-submit{font-family:var(--body);font-size:.92rem;font-weight:600;cursor:pointer;background:var(--ink);color:var(--paper);border:none;border-radius:999px;padding:11px 22px;transition:background .2s,transform .1s;}
.qst-submit:hover{background:var(--brand);}
.qst-submit:disabled{opacity:.5;cursor:default;}

@keyframes qstFade{from{opacity:0;}to{opacity:1;}}
@keyframes qstPop{from{opacity:0;transform:translateY(8px) scale(.98);}to{opacity:1;transform:none;}}
`