import { Router } from 'express'
import { pool } from './db.js'
import { requireAuth, type AuthRequest } from './middleware.js'

export const historiesRouter = Router()

historiesRouter.use(requireAuth)

// --- List history (filterable by application) ---
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
    res.status(500).json({ error: 'Server error.', detail: String(err) })
  }
})

// --- Add a history entry ---
historiesRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { id, application_id, status, reason, date_updated } = req.body
    if (!application_id || !status) {
      return res.status(400).json({ error: 'application_id et status requis.' })
    }
    const result = await pool.query(
      `insert into histories_status (id, user_id, application_id, status, date_updated, reason)
       values (coalesce($1, gen_random_uuid()), $2, $3, $4::application_status,
               coalesce($5, now()), $6)
       on conflict (id) do update set
         status       = excluded.status,
         reason       = excluded.reason,
         date_updated = excluded.date_updated
       where histories_status.user_id = excluded.user_id
       returning *`,
      [id ?? null, req.userId, application_id, status, date_updated ?? null, reason ?? null]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur.', detail: String(err) })
  }
})