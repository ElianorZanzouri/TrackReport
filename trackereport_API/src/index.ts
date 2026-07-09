import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { pool } from './db.js'
import { authRouter } from './auth.js'
import { requireAuth, type AuthRequest } from './middleware.js'
import { applicationsRouter } from './applications.js'
import { companiesRouter } from './companies.js'
import { contactsRouter } from './contacts.js'
import { historiesRouter } from './histories.js'
import { interviewsRouter } from './interviews.js'
import { profileRouter } from './profile.js'
import { analyzeRouter } from './analyze.js'

const app = express()

app.use(cors())
app.use(express.json())

// Routes
app.use('/auth', authRouter)
app.use('/applications', applicationsRouter)
app.use('/companies', companiesRouter)
app.use('/contacts', contactsRouter)
app.use('/histories', historiesRouter)
app.use('/interviews', interviewsRouter)
app.use('/profile', profileRouter)
app.use('/analyze', analyzeRouter)

// Route de test : le serveur répond-il ?
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'trackreport-api',
    time: new Date().toISOString(),
  })
})

// Route de test : la base de données répond-elle ?
app.get('/db-test', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW()')
    res.json({ ok: true, dbTime: result.rows[0].now })
  } catch (err) {
    console.error('Erreur base de données :', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// Route de test
app.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ userId: req.userId })
})

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000
app.listen(PORT, () => {
  console.log(`API TrackReport => http://localhost:${PORT}`)
})