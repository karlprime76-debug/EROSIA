import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    let body: Record<string, unknown>
    try { body = await request.json() } catch {
      return apiError('Corps de requête invalide', 400)
    }
    const targetUserIds = body.targetUserIds as string[]
    if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      return apiError('targetUserIds requis', 400)
    }

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('get_privacy_check_data', { target_user_ids: targetUserIds })

    if (error) {
      logger.error('Privacy check RPC error', { error: error.message })
      return apiError(error.message, 500)
    }

    return apiResponse(data)
  } catch (err) {
    return apiServerError(err)
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('privacy_settings')
      .select('user_id')
      .eq('visible_to_compatible_only', true)

    if (error) {
      logger.error('Privacy visible_to_compatible_only error', { error: error.message })
      return apiError(error.message, 500)
    }

    return apiResponse(data?.map(r => r.user_id) ?? [])
  } catch (err) {
    return apiServerError(err)
  }
}
