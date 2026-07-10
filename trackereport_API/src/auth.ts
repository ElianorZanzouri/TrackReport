import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from './db.js'

export const authRouter = Router()

// --- Sign up: create an account ---
authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required.' })
    }

    // 1. Hash the password (never stored in plain text).
    const passwordHash = await bcrypt.hash(password, 10)

    // 2. Register the user in the database.
    const result = await pool.query(
      `insert into users (email, password_hash, full_name)
       values ($1, $2, $3)
       returning id, email, full_name`,
      [email, passwordHash, full_name ?? null]
    )
    const user = result.rows[0]

    // 3. Create a token to log in the user immediately.
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET as string, {
      expiresIn: '7d',
    })

    res.json({ token, user })
  } catch (err: any) {
    // Code 23505 = uniqueness violation (email already used).
    if (err.code === '23505') {
      return res.status(409).json({ error: 'This email is already in use.' })
    }
    console.error('Register error:', err)
    res.status(500).json({ error: 'Server error.' })
  }
})

// --- Login: verify email + password ---
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required.' })
    }

    // 1. Find the user by email.
    const result = await pool.query(
      `select id, email, password_hash, full_name from users where email = $1`,
      [email]
    )
    const user = result.rows[0]

    // 2. Verify that the account exists AND that the password matches.
    //    (message intentionally identical in both cases, for security)
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Email or password incorrect.' })
    }

    // 3. Create a token.
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET as string, {
      expiresIn: '7d',
    })

    res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name },
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Server error.' })
  }
})

