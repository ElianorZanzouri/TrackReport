import { Router } from 'express'
import { pool } from './db.js'
import { requireAuth, type AuthRequest } from './middleware.js'

export const interviewsRouter = Router()

interviewsRouter.use(requireAuth)

// --- Lister mes questions ---
interviewsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `select * from interview where user_id = $1 order by created_at desc`,
      [req.userId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur.', detail: String(err) })
  }
})

// --- Créer une question ---
interviewsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { question, answer, category, tags } = req.body
    if (!question) {
      return res.status(400).json({ error: 'La question est requise.' })
    }
    const result = await pool.query(
      `insert into interview (user_id, question, answer, category, tags)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [req.userId, question, answer ?? null, category ?? null, tags ?? null]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur.', detail: String(err) })
  }
})

// --- Modifier une question ---
interviewsRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const { question, answer, category, tags } = req.body
    const result = await pool.query(
      `update interview set
         question = coalesce($1, question),
         answer   = coalesce($2, answer),
         category = coalesce($3, category),
         tags     = coalesce($4, tags)
       where id = $5 and user_id = $6
       returning *`,
      [question ?? null, answer ?? null, category ?? null, tags ?? null,
       req.params.id, req.userId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question introuvable.' })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur.', detail: String(err) })
  }
})

// --- Supprimer une question ---
interviewsRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `delete from interview where id = $1 and user_id = $2 returning id`,
      [req.params.id, req.userId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question introuvable.' })
    }
    res.json({ ok: true, id: result.rows[0].id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur.', detail: String(err) })
  }
})