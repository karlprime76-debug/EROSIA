import { createClient } from '@/lib/supabase/server'
import { reportSchema } from '@/lib/validations'
import { logger } from '@/lib/logger'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return apiError('Corps de requête invalide')
    }
    const parsed = reportSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return apiError(firstError)
    }

    const { reported_id, reason, description, match_id, message_id } = parsed.data

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_id,
      reason,
      description: description || null,
      match_id: match_id || null,
      message_id: message_id || null,
    })

    if (error) return apiError(error.message)

    await supabase.from('consent_log').insert({
      user_id: user.id,
      action_type: 'report_submitted',
      target_user_id: reported_id,
      metadata: { reason },
    })

    return apiResponse({ success: true })
  } catch (err) {
    logger.error('Safety report POST error', { error: String(err) })
    return apiServerError(err)
  }
}
