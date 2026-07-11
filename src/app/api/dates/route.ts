import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
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
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data: dates })
    }
    const { data, error } = await supabase.rpc('get_upcoming_dates', { p_user_id: user.id })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, {
      headers: { 'Cache-Control': 'private, s-maxage=15, stale-while-revalidate=30' },
    })
  } catch (err) {
    logger.error('Dates GET error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
