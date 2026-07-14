import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)
    const { data, error } = await supabase.from('user_levels').select('*').eq('user_id', user.id).maybeSingle()
    if (error) return apiError(error.message, 500)
    return apiResponse(data ?? { level: 1, xp: 0, xp_to_next: 100, total_xp: 0 })
  } catch (err) {
    logger.error('Levels error', { error: String(err) })
    return apiServerError(err)
  }
}
