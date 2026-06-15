// @ts-nocheck
// Edge Function: CV/job fit analysis using the Gemini API.
// The Gemini key stays secret on Supabase and is never exposed to the browser.
//
// Deploy with: npx supabase functions deploy analyze-cv

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Free multimodal model (reads PDFs natively).
const MODEL = 'gemini-2.5-flash'

// Expected response shape (structured JSON output).
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

const PROMPT = `You are a supportive, precise recruiting coach.
Based on the provided CV (PDF) and the job description below,
evaluate the candidate's fit for the role.

Answer in English, clearly and helpfully. Provide:
- score: an integer from 0 to 100 (overall fit)
- summary: 2-3 concise sentences
- strengths: the candidate's assets for THIS role
- gaps: missing skills or gaps to address
- questions: likely interview questions for this position
- advice: tips to tailor the application

Job description:
`

Deno.serve(async (req: Request) => {
  // CORS preflight (browser sends this before the actual request).
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return json({ error: 'GEMINI_API_KEY missing server-side.' }, 500)
    }

    const { jobDescription, cvBase64, cvMimeType } = await req.json()

    if (!jobDescription || !cvBase64) {
      return json({ error: 'Job description and CV are required.' }, 400)
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
                {
                  inline_data: {
                    mime_type: cvMimeType || 'application/pdf',
                    data: cvBase64,
                  },
                },
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
      return json({ error: 'Gemini error', detail }, 502)
    }

    const data = await geminiRes.json()
    // The text returned by Gemini is JSON (because of the schema).
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return json({ error: 'Empty response from Gemini.' }, 502)
    }

    const analysis = JSON.parse(text)
    return json(analysis, 200)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}