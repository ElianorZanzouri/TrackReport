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

const PROMPT = `You are a kind and precise recruitment coach.
Based on the CV provided (in PDF) and the job description below,
evaluate the candidate's fit for the position.

Respond in English, in a concrete and useful way. Provide:
- score: an integer from 0 to 100 (overall fit)
- summary: 2-3 summary sentences
- strengths: the profile's assets for THIS position
- gaps: gaps or missing skills to fill
- questions: likely interview questions for this position
- advice: tips to tailor the application

Job description:
`

analyzeRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    console.log('GEMINI présent ?', apiKey ? 'oui' : 'NON')
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY missing.' })
    }

    const { jobDescription, cvBase64, cvMimeType } = req.body
    if (!jobDescription || !cvBase64) {
      return res.status(400).json({ error: 'Job description and CV required.' })
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
      return res.status(502).json({ error: 'Gemini error', detail })
    }

    const data = await geminiRes.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return res.status(502).json({ error: 'Empty response from Gemini.' })
    }

    res.json(JSON.parse(text))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error.', detail: String(err) })
  }
})