import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from './db.js'

export const authRouter = Router()

// --- Inscription : créer un compte ---
authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' })
    }

    // 1. Chiffrer le mot de passe (jamais stocké en clair).
    const passwordHash = await bcrypt.hash(password, 10)

    // 2. Enregistrer l'utilisateur en base.
    const result = await pool.query(
      `insert into users (email, password_hash, full_name)
       values ($1, $2, $3)
       returning id, email, full_name`,
      [email, passwordHash, full_name ?? null]
    )
    const user = result.rows[0]

    // 3. Créer un jeton pour connecter l'utilisateur immédiatement.
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET as string, {
      expiresIn: '7d',
    })

    res.json({ token, user })
  } catch (err: any) {
    // Code 23505 = violation d'unicité (email déjà utilisé).
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Cet email est déjà utilisé.' })
    }
    console.error('Erreur register :', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

// --- Connexion : vérifier email + mot de passe ---
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' })
    }

    // 1. Retrouver l'utilisateur par son email.
    const result = await pool.query(
      `select id, email, password_hash, full_name from users where email = $1`,
      [email]
    )
    const user = result.rows[0]

    // 2. Vérifier que le compte existe ET que le mot de passe correspond.
    //    (message volontairement identique dans les deux cas, pour la sécurité)
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' })
    }

    // 3. Créer un jeton.
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET as string, {
      expiresIn: '7d',
    })

    res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name },
    })
  } catch (err) {
    console.error('Erreur login :', err)
    res.status(500).json({ error: 'Erreur serveur.' })
  }
})

