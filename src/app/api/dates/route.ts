import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const history = searchParams.get('history') === 'true'
    if (history) {
      const from = (page - 1) * 20
      const to = from + 19
      const { data: dates, error } = await supabase
        .from('planned_dates')
        .select('*, date_slots(*)')
        .or(`proposer_id.eq.${user.id},proposee_id.eq.${user.id}`)
        .in('status', ['declined', 'cancelled', 'completed'])
        .order('updated_at', { ascending: false })
        .range(from, to)
      if (error) return apiError(error.message, 500)
      return apiResponse(dates)
    }
    const { data, error } = await supabase.rpc('get_upcoming_dates', { p_user_id: user.id })
    if (error) return apiError(error.message, 500)
    const res = apiResponse(data)
    res.headers.set('Cache-Control', 'private, s-maxage=15, stale-while-revalidate=30')
    return res
  } catch (err) {
    logger.error('Dates GET error', { error: String(err) })
    return apiServerError(err)
  }
}
