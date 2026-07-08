import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { matchId, text } = await request.json()
    if (!matchId || !text?.trim()) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: match } = await admin
      .from('matches')
      .select('user1_id, user2_id')
      .eq('id', matchId)
      .maybeSingle()

    if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })

    const isParticipant = match.user1_id === user.id || match.user2_id === user.id
    if (!isParticipant) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const targetId = match.user1_id === user.id ? match.user2_id : match.user1_id

    const { data: blockByTarget } = await admin
      .from('blocks')
      .select('id')
      .eq('blocker_id', targetId)
      .eq('blocked_id', user.id)
      .maybeSingle()

    if (blockByTarget) return NextResponse.json({ error: 'Action non autorisée' }, { status: 403 })

    const { count: msgCount } = await admin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('match_id', matchId)

    if (!msgCount) {
      const { data: targetPrivacy } = await admin
        .from('privacy_settings')
        .select('first_message_permission')
        .eq('user_id', targetId)
        .maybeSingle()

      if (targetPrivacy) {
        const perm = targetPrivacy.first_message_permission as string
        if (perm === 'nobody') {
          return NextResponse.json({ error: "Cette personne n'accepte pas de nouveaux messages" }, { status: 403 })
        }
        if (perm === 'verified_only') {
          const { data: sender } = await admin
            .from('profiles')
            .select('is_verified')
            .eq('id', user.id)
            .maybeSingle()
          if (!sender?.is_verified) {
            return NextResponse.json({ error: 'Seuls les comptes vérifiés peuvent envoyer un message' }, { status: 403 })
          }
        }
      }
    }

    const clean = text.replace(/<[^>]*>/g, '').slice(0, 5000)
    if (!clean.trim()) return NextResponse.json({ error: 'Message vide' }, { status: 400 })

    const { data: message, error } = await admin
      .from('messages')
      .insert({ match_id: matchId, sender_id: user.id, text: clean })
      .select()
      .single()

    if (error) {
      logger.error('Failed to send message', { error: error.message, matchId, userId: user.id })
      return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 })
    }

    return NextResponse.json({ data: message })
  } catch (err) {
    logger.error('Send message error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
