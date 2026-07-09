import pkg from 'pg'
import 'dotenv/config'

const { Pool } = pkg

// Un "pool" gère un ensemble de connexions à la base, réutilisées efficacement.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})