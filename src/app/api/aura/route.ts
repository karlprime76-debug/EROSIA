import { createClient } from '@/lib/supabase/server'
import { computeAndSaveAura, getAura } from '@/lib/aura'
import { logger } from '@/lib/logger'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const { data: auraData, error: auraError } = await getAura(user.id, supabase)
    let aura = auraData
    if (auraError || !aura) {
      const result = await computeAndSaveAura(user.id, supabase)
      if (result.error) {
        logger.error('computeAndSaveAura failed', { userId: user.id, error: String(result.error ?? 'Erreur') })
        return apiError(String(result.error ?? 'Erreur'))
      }
      aura = result.data
    }

    return apiResponse({ aura })
  } catch (err) {
    return apiServerError(err)
  }
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const result = await computeAndSaveAura(user.id, supabase)
    if (result.error) return apiError(String(result.error ?? 'Erreur'))

    return apiResponse({ aura: result.data })
  } catch (err) {
    return apiServerError(err)
  }
}
