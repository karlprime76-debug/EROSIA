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

    const { data: rpcResult, error: rpcError } = await supabase.rpc('delete_match', {
      match_id: matchId,
      requesting_user_id: user.id,
    })

    if (rpcError || rpcResult?.error) {
      return NextResponse.json({ error: rpcResult?.error ?? 'Erreur lors de la suppression' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('Delete match error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
