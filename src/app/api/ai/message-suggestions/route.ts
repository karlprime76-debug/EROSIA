import { createClient } from '@/lib/supabase/server'
import { generateMessageSuggestions } from '@/lib/message-suggestions'
import { messageSuggestionsSchema } from '@/lib/validations'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    let body: Record<string, unknown>
    try { body = await request.json() } catch {
      return apiError('Corps de requête invalide')
    }
    const parsed = messageSuggestionsSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return apiError(firstError)
    }

    const { matchId } = parsed.data

    const { data: match } = await supabase.from('matches').select('user1_id, user2_id').eq('id', matchId).maybeSingle()
    if (!match || (match.user1_id !== user.id && match.user2_id !== user.id)) {
      return apiError('Match introuvable', 403)
    }

    const targetId = match.user1_id === user.id ? match.user2_id : match.user1_id

    const result = await generateMessageSuggestions({ userId: user.id, targetId, matchId })
    if (result.error) return apiError(result.error)

    return apiResponse({ suggestions: result.suggestions })
  } catch (err) {
    return apiServerError(err)
  }
}
