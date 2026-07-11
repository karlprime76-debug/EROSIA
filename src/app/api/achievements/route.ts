import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const [achRes, uaRes] = await Promise.all([
      supabase.from('achievements').select('*').order('category'),
      supabase.from('user_achievements').select('*, achievement:achievements(*)').eq('user_id', user.id),
    ])
    if (achRes.error) return NextResponse.json({ error: achRes.error.message }, { status: 500 })
    if (uaRes.error) return NextResponse.json({ error: uaRes.error.message }, { status: 500 })
    return NextResponse.json({ all: achRes.data, unlocked: uaRes.data })
  } catch (err) {
    logger.error('Achievements error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
