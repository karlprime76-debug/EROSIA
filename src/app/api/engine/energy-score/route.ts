import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { energyScoreEngine } from '@/lib/engine'
import { logger } from '@/lib/logger'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const admin = createAdminClient()
    const result = await energyScoreEngine.compute({ userId: user.id }, admin)
    const score = result.score

    const { error: updateError } = await admin
      .from('user_scores')
      .upsert({ user_id: user.id, energy_score: score / 100 }, { onConflict: 'user_id' })

    if (updateError) {
      logger.error('Energy score update failed', { error: updateError.message, userId: user.id })
      return apiError('Erreur lors de la mise à jour', 500)
    }

    return apiResponse({ score, factors: result.factors })
  } catch (err) {
    logger.error('Energy score route error', { error: String(err) })
    return apiServerError(err)
  }
}
