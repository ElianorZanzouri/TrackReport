import { Router } from 'express'
import { pool } from './db.js'
import { requireAuth, type AuthRequest } from './middleware.js'

export const historiesRouter = Router()

historiesRouter.use(requireAuth)

// --- Lister l'historique (filtrable par candidature) ---
historiesRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const { application_id } = req.query
    const result = application_id
      ? await pool.query(
          `select * from histories_status
           where user_id = $1 and application_id = $2
           order by date_updated desc`,
          [req.userId, application_id]
        )
      : await pool.query(
          `select * from histories_status where user_id = $1 order by date_updated desc`,
          [req.userId]
        )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur.', detail: String(err) })
  }
})

// --- Ajouter une entrée d'historique ---
historiesRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { application_id, status, reason } = req.body
    if (!application_id || !status) {
      return res.status(400).json({ error: 'application_id et status requis.' })
    }
    const result = await pool.query(
      `insert into histories_status (user_id, application_id, status, reason)
       values ($1, $2, $3::application_status, $4)
       returning *`,
      [req.userId, application_id, status, reason ?? null]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur.', detail: String(err) })
  }
})
