import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const blockedId = searchParams.get('blockedId')
    if (!blockedId) return NextResponse.json({ error: 'blockedId requis' }, { status: 400 })

    const { data, error } = await supabase.rpc('is_blocked', {
      blocker_id: user.id,
      blocked_id: blockedId,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ blocked: !!data })
  } catch (err) {
    logger.error('Safety block check error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
