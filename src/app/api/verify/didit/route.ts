import { createClient } from '@/lib/supabase/server'
import { createVerificationSession } from '@/lib/didit'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    if (!siteUrl) return apiError('Erreur de configuration serveur', 500)
    const callbackUrl = `${siteUrl}/api/verify/webhook`

    const { sessionId, url } = await createVerificationSession(user.id, callbackUrl)

    const { data: existing } = await supabase
      .from('verification_requests')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['pending', 'manual_review'])
      .maybeSingle()

    if (existing) {
      const { error: updateError } = await supabase
        .from('verification_requests')
        .update({ didit_session_id: sessionId, status: 'pending', rejection_reason: null, verified_at: null })
        .eq('id', existing.id)

      if (updateError) {
        const { logger } = await import('@/lib/logger')
        logger.error('Failed to update existing verification request', { error: updateError.message, userId: user.id })
      }
    } else {
      const { error: insertError } = await supabase
        .from('verification_requests')
        .insert({ user_id: user.id, didit_session_id: sessionId, status: 'pending' })

      if (insertError) {
        if (insertError.code === '23505') {
          const { logger } = await import('@/lib/logger')
          logger.info('Duplicate session_id — race condition, session already exists', { userId: user.id, sessionId })
        } else {
          const { logger } = await import('@/lib/logger')
          logger.error('Failed to save verification request', { error: insertError.message, userId: user.id, sessionId })
          return apiError('Erreur lors de la création de la demande', 500)
        }
      }
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ verification_status: 'pending' })
      .eq('id', user.id)

    if (profileError) {
      const { logger } = await import('@/lib/logger')
      logger.error('Failed to update profile verification_status', { error: profileError.message, userId: user.id })
    }

    return apiResponse({ url, sessionId })
  } catch (err) {
    return apiServerError(err)
  }
}
