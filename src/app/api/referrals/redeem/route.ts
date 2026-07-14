import { createClient } from '@/lib/supabase/server'
import { redeemReferralReward } from '@/lib/referrals-server'
import { logger } from '@/lib/logger'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const result = await redeemReferralReward()
    if (result.error) return apiError(result.error)

    return apiResponse({ success: true })
  } catch (err) {
    logger.error('Referral redeem error', { error: String(err) })
    return apiServerError(err)
  }
}
