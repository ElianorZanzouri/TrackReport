import { Router } from 'express'
import { requireAuth, type AuthRequest } from './middleware.js'

export const analyzeRouter = Router()

analyzeRouter.use(requireAuth)

const MODEL = 'gemini-2.5-flash'

const responseSchema = {
  type: 'object',
  properties: {
    score: { type: 'integer' },
    summary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    gaps: { type: 'array', items: { type: 'string' } },
    questions: { type: 'array', items: { type: 'string' } },
    advice: { type: 'array', items: { type: 'string' } },
  },
  required: ['score', 'summary', 'strengths', 'gaps', 'questions', 'advice'],
}

const PROMPT = `Tu es un coach en recrutement bienveillant et précis.
À partir du CV fourni (en PDF) et de la description de poste ci-dessous,
évalue la compatibilité du candidat avec le poste.

Réponds en français, de façon concrète et utile. Fournis :
- score : un entier de 0 à 100 (compatibilité globale)
- summary : 2-3 phrases de synthèse
- strengths : les atouts du profil pour CE poste
- gaps : les écarts ou compétences manquantes à combler
- questions : des questions probables en entretien pour ce poste
- advice : des conseils pour adapter la candidature

Description du poste :
`

analyzeRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'Clé GEMINI_API_KEY manquante.' })
    }

    const { jobDescription, cvBase64, cvMimeType } = req.body
    if (!jobDescription || !cvBase64) {
      return res.status(400).json({ error: 'Description du poste et CV requis.' })
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: cvMimeType || 'application/pdf', data: cvBase64 } },
                { text: PROMPT + jobDescription },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema,
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const detail = await geminiRes.text()
      return res.status(502).json({ error: 'Erreur Gemini', detail })
    }

    const data = await geminiRes.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return res.status(502).json({ error: 'Réponse vide de Gemini.' })
    }

    res.json(JSON.parse(text))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erreur serveur.', detail: String(err) })
  }
})