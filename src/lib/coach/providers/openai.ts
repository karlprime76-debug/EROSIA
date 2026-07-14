import type { CoachResult, ProfileInput } from '../types'
import { logger } from '@/lib/logger'

const SYSTEM_PROMPT = `Tu es un coach de profil pour application de rencontre.
Analyse le profil reçu et retourne UNIQUEMENT un objet JSON (pas de texte autour).
Format attendu:
{
  "score": <nombre entre 0 et 100>,
  "summary": "<résumé court de la qualité du profil>",
  "suggestions": [
    { "type": "photo|bio|interests|general", "severity": "tip|warning|info", "title": "<titre court>", "description": "<conseil>", "field": "<nom du champ>" }
  ],
  "strengths": ["<point fort 1>", "<point fort 2>"]
}
Sois précis, concret et encourageant. Maximum 5 suggestions, priorise les plus importantes.`

function buildUserPrompt(p: ProfileInput): string {
  return `Profil à analyser:
- Nom: ${p.name ?? 'Non renseigné'}
- Bio: ${p.bio ?? '(vide)'}
- Photos: ${p.photos?.length ?? 0} photo(s)
- Vidéo: ${p.video_url ? 'Oui' : 'Non'}
- Centres d'intérêt: ${(p.interests ?? []).join(', ') || '(aucun)'}
- Occupation: ${p.occupation ?? '(non renseignée)'}
- Localisation: ${p.location ?? '(non renseignée)'}
- Âge: ${p.age ?? '(non renseigné)'}
- Vérifié: ${p.is_verified ? 'Oui' : 'Non'}
- Mood: ${p.mood ?? '(non renseigné)'}
- Recherche: ${p.looking_for ?? '(non renseigné)'}`
}

export async function analyze(p: ProfileInput): Promise<CoachResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    logger.warn('OPENAI_API_KEY not set, falling back to rules engine')
    const { analyze: rulesAnalyze } = await import('./rules')
    return rulesAnalyze(p)
  }

  try {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey })

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(p) },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
      temperature: 0.7,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('Réponse vide de l\'IA')

    const result = JSON.parse(content) as CoachResult
    return {
      score: Math.max(0, Math.min(100, result.score ?? 50)),
      summary: result.summary ?? 'Analyse effectuée.',
      suggestions: (result.suggestions ?? []).slice(0, 5),
      strengths: result.strengths ?? [],
    }
  } catch (err) {
    logger.error('Coach OpenAI error', { error: String(err) })
    const { analyze: rulesAnalyze } = await import('./rules')
    return rulesAnalyze(p)
  }
}
