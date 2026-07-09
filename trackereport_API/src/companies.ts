import { Router } from 'express'
import { pool } from './db.js'
import { requireAuth, type AuthRequest } from './middleware.js'

export const companiesRouter = Router()

// Toutes les routes exigent un utilisateur connecté.
companiesRouter.use(requireAuth)

// --- Lister mes entreprises ---
companiesRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `select * from companies where user_id = $1 order by company_name asc`,
      [req.userId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur.', detail: String(err) })
  }
})

// --- Créer une entreprise ---
companiesRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { company_name, domain, notes } = req.body
    if (!company_name) {
      return res.status(400).json({ error: 'Le nom est requis.' })
    }
    const result = await pool.query(
      `insert into companies (user_id, company_name, domain, notes)
       values ($1, $2, $3, $4)
       returning *`,
      [req.userId, company_name, domain ?? null, notes ?? null]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur.', detail: String(err) })
  }
})

// --- Modifier une entreprise ---
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
      return res.status(404).json({ error: 'Entreprise introuvable.' })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur.', detail: String(err) })
  }
})

// --- Supprimer une entreprise ---
companiesRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `delete from companies where id = $1 and user_id = $2 returning id`,
      [req.params.id, req.userId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entreprise introuvable.' })
    }
    res.json({ ok: true, id: result.rows[0].id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur.', detail: String(err) })
  }
})
