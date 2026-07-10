import { Router } from 'express'
import { pool } from './db.js'
import { requireAuth, type AuthRequest } from './middleware.js'

export const applicationsRouter = Router()

// All routes below require a logged-in user.
applicationsRouter.use(requireAuth)

// --- List my applications ---
applicationsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `select * from applications where user_id = $1 order by created_at desc`,
      [req.userId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error.' })
  }
})

// --- Create an application ---
applicationsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { company_id, position, description, status_actuel, date_update } = req.body
    if (!position) {
      return res.status(400).json({ error: 'Position is required.' })
    }
    const result = await pool.query(
      `insert into applications
         (user_id, company_id, position, description, status_actuel, date_update)
       values ($1, $2, $3, $4, coalesce($5::application_status, 'applied'), $6)
       returning *`,
      [req.userId, company_id ?? null, position, description ?? null,
       status_actuel ?? null, date_update ?? null]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error.', detail: String(err) })
  }
})

// --- Update an application ---
applicationsRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const { position, description, status_actuel, date_update, company_id } = req.body
    const result = await pool.query(
      `update applications set
         position     = coalesce($1, position),
         description  = coalesce($2, description),
         status_actuel = coalesce($3, status_actuel),
         date_update  = coalesce($4, date_update),
         company_id   = coalesce($5, company_id)
       where id = $6 and user_id = $7
       returning *`,
      [position ?? null, description ?? null, status_actuel ?? null,
       date_update ?? null, company_id ?? null, req.params.id, req.userId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found.' })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error.' })
  }
})

// --- Delete an application ---
applicationsRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `delete from applications where id = $1 and user_id = $2 returning id`,
      [req.params.id, req.userId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found.' })
    }
    res.json({ ok: true, id: result.rows[0].id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error.' })
  }
})