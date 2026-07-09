import { Router } from 'express'
import { pool } from './db.js'
import { requireAuth, type AuthRequest } from './middleware.js'

export const profileRouter = Router()

profileRouter.use(requireAuth)

// --- Lire mon profil ---
profileRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `select id, email, full_name, about, created_at from users where id = $1`,
      [req.userId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profil introuvable.' })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur.', detail: String(err) })
  }
})

// --- Mettre à jour mon profil ---
profileRouter.patch('/', async (req: AuthRequest, res) => {
  try {
    const { full_name, about } = req.body
    const result = await pool.query(
      `update users set
         full_name = coalesce($1, full_name),
         about     = coalesce($2, about)
       where id = $3
       returning id, email, full_name, about`,
      [full_name ?? null, about ?? null, req.userId]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur.', detail: String(err) })
  }
})