import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    let query = supabase.from('safety_tips').select('*').order('priority', { ascending: false })

    if (category && ['dating', 'privacy', 'security', 'consent'].includes(category)) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) return apiError(error.message)
    const res = apiResponse(data)
    res.headers.set('Cache-Control', 'public, s-maxage=3600, immutable')
    return res
  } catch (err) {
    logger.error('Safety tips GET error', { error: String(err) })
    return apiServerError(err)
  }
}
