import { Router } from 'express'
import { pool } from './db.js'
import { requireAuth, type AuthRequest } from './middleware.js'

export const contactsRouter = Router()

contactsRouter.use(requireAuth)

// --- Lister mes contacts (option : filtrer par entreprise) ---
contactsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const { company_id } = req.query
    const result = company_id
      ? await pool.query(
          `select * from contacts where user_id = $1 and company_id = $2 order by created_at asc`,
          [req.userId, company_id]
        )
      : await pool.query(
          `select * from contacts where user_id = $1 order by created_at asc`,
          [req.userId]
        )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur.', detail: String(err) })
  }
})

// --- Créer un contact ---
contactsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { company_id, name, position, mail, phone, notes } = req.body
    if (!name) {
      return res.status(400).json({ error: 'Le nom est requis.' })
    }
    const result = await pool.query(
      `insert into contacts (user_id, company_id, name, position, mail, phone, notes)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [req.userId, company_id ?? null, name, position ?? null,
       mail ?? null, phone ?? null, notes ?? null]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur.', detail: String(err) })
  }
})

// --- Modifier un contact ---
contactsRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const { name, position, mail, phone, notes } = req.body
    const result = await pool.query(
      `update contacts set
         name     = coalesce($1, name),
         position = coalesce($2, position),
         mail     = coalesce($3, mail),
         phone    = coalesce($4, phone),
         notes    = coalesce($5, notes)
       where id = $6 and user_id = $7
       returning *`,
      [name ?? null, position ?? null, mail ?? null, phone ?? null,
       notes ?? null, req.params.id, req.userId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact introuvable.' })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur.', detail: String(err) })
  }
})

// --- Supprimer un contact ---
contactsRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `delete from contacts where id = $1 and user_id = $2 returning id`,
      [req.params.id, req.userId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact introuvable.' })
    }
    res.json({ ok: true, id: result.rows[0].id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur.', detail: String(err) })
  }
})