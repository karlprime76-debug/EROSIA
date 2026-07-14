import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const { data, error } = await supabase.rpc('generate_referral_code', { p_user_id: user.id })

    if (error) {
      logger.error('Generate referral code RPC error', { error: String(error) })
      return apiError('Erreur lors de la génération', 500)
    }

    const result = data as { code?: string; error?: string }
    if (result.error) return apiError(result.error)

    return apiResponse({ code: result.code })
  } catch (err) {
    logger.error('Referral code API error', { error: String(err) })
    return apiServerError(err)
  }
}
