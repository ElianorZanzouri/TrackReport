import { Router } from 'express'
import { pool } from './db.js'
import { requireAuth, type AuthRequest } from './middleware.js'

export const companiesRouter = Router()

// All routes require a logged-in user.
companiesRouter.use(requireAuth)

// --- List my companies ---
companiesRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `select * from companies where user_id = $1 order by company_name asc`,
      [req.userId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error.', detail: String(err) })
  }
})

// --- Create a company ---
companiesRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { id, company_name, domain, notes, created_at } = req.body
    if (!company_name) {
      return res.status(400).json({ error: 'Le nom est requis.' })
    }
    const result = await pool.query(
      `insert into companies (id, user_id, company_name, domain, notes, created_at)
       values (coalesce($1, gen_random_uuid()), $2, $3, $4, $5, coalesce($6, now()))
       on conflict (id) do update set
         company_name = excluded.company_name,
         domain       = excluded.domain,
         notes        = excluded.notes
       where companies.user_id = excluded.user_id
       returning *`,
      [id ?? null, req.userId, company_name, domain ?? null, notes ?? null, created_at ?? null]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur.', detail: String(err) })
  }
})

// --- Update a company ---
companiesRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const { company_name, domain, notes } = req.body
    const result = await pool.query(
      `update companies set
         company_name = coalesce($1, company_name),
         domain       = coalesce($2, domain),
         notes        = coalesce($3, notes)
       where id = $4 and user_id = $5
       returning *`,
      [company_name ?? null, domain ?? null, notes ?? null, req.params.id, req.userId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found.' })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error.', detail: String(err) })
  }
})

// --- Delete a company ---
companiesRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `delete from companies where id = $1 and user_id = $2 returning id`,
      [req.params.id, req.userId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found.' })
    }
    res.json({ ok: true, id: result.rows[0].id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error.', detail: String(err) })
  }
})
