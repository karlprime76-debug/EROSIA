import { createClient } from '@/lib/supabase/server'
import { generateIcebreaker } from '@/lib/icebreaker'
import { logger } from '@/lib/logger'
import { icebreakerSchema } from '@/lib/validations'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    let body: Record<string, unknown>
    try { body = await request.json() } catch {
      return apiError('Corps de requête invalide', 400)
    }
    const parsed = icebreakerSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return apiError(firstError, 400)
    }

    const { targetId } = parsed.data

    const { data: matches } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .limit(100)
    const isMatched = matches?.some(m =>
      (m.user1_id === user.id && m.user2_id === targetId) ||
      (m.user1_id === targetId && m.user2_id === user.id)
    )
    if (!isMatched) return apiError('Vous devez être en match', 403)

    const result = await generateIcebreaker({ userId: user.id, targetId })
    if (result.error) return apiError(result.error, 400)

    return apiResponse({ suggestion: result.suggestion })
  } catch (err) {
    logger.error('Icebreaker route error', { error: String(err) })
    return apiServerError(err)
  }
}
