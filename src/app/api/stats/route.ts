import { createClient } from '@/lib/supabase/server'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)
    const { data, error } = await supabase.from('user_stats').select('*').eq('user_id', user.id).maybeSingle()
    if (error) return apiError(error.message, 500)
    return apiResponse(data ?? {})
  } catch (err) {
    return apiServerError(err)
  }
}
