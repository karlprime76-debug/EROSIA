import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { deleteMatchSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    let body: Record<string, unknown>
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 }) }
    const parsed = deleteMatchSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'matchId requis' }, { status: 400 })
    const { matchId } = parsed.data

    const { data: match } = await supabase
      .from('matches').select('user1_id,user2_id').eq('id', matchId).maybeSingle()
    if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })
    if (match.user1_id !== user.id && match.user2_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const admin = createAdminClient()
    const otherId = match.user1_id === user.id ? match.user2_id : match.user1_id

    const results = await Promise.allSettled([
      admin.from('swipes').delete().or(`and(swiper_id.eq.${user.id},swiped_id.eq.${otherId}),and(swiper_id.eq.${otherId},swiped_id.eq.${user.id})`),
      admin.from('messages').delete().eq('match_id', matchId),
      admin.from('matches').delete().eq('id', matchId),
    ])

    const errors = results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason)
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('Delete match error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
