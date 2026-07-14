import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { behaviorSchema } from '@/lib/validations'
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
    const parsed = behaviorSchema.safeParse(body)
    if (!parsed.success) {
      return apiError('Données invalides')
    }

    const { action, targetId, metadata } = parsed.data

    const { error } = await supabase.from('behavior_log').insert({
      user_id: user.id,
      action,
      target_id: targetId ?? null,
      metadata: metadata ?? null,
    })

    if (error) {
      logger.error('Failed to log behavior', { error: error.message, action, userId: user.id })
      return apiError('Erreur lors de l\'enregistrement', 500)
    }

    return apiResponse({ success: true })
  } catch (err) {
    logger.error('Behavior POST error', { error: String(err) })
    return apiServerError(err)
  }
}
