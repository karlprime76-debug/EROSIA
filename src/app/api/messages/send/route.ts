import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { sendMessageSchema } from '@/lib/validations'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    let requestBody: Record<string, unknown>
    try { requestBody = await request.json() } catch {
      return apiError('Corps de requête invalide', 400)
    }
    const parsed = sendMessageSchema.safeParse(requestBody)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return apiError(firstError, 400)
    }
    const { matchId, text } = parsed.data

    const admin = createAdminClient()

    const { data: match } = await admin
      .from('matches')
      .select('user1_id, user2_id')
      .eq('id', matchId)
      .maybeSingle()

    if (!match) return apiError('Match introuvable', 404)

    const isParticipant = match.user1_id === user.id || match.user2_id === user.id
    if (!isParticipant) return apiError('Non autorisé', 403)

    const targetId = match.user1_id === user.id ? match.user2_id : match.user1_id

    const { data: blockByTarget } = await admin
      .from('blocks')
      .select('id')
      .eq('blocker_id', targetId)
      .eq('blocked_id', user.id)
      .maybeSingle()

    if (blockByTarget) return apiError('Action non autorisée', 403)

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
          return apiError("Cette personne n'accepte pas de nouveaux messages", 403)
        }
        if (perm === 'verified_only') {
          const { data: sender } = await admin
            .from('profiles')
            .select('is_verified')
            .eq('id', user.id)
            .maybeSingle()
          if (!sender?.is_verified) {
            return apiError('Seuls les comptes vérifiés peuvent envoyer un message', 403)
          }
        }
      }
    }

    const clean = text.replace(/<[^>]*>/g, '').slice(0, 5000)
    if (!clean.trim()) return apiError('Message vide', 400)

    const { data: message, error } = await admin
      .from('messages')
      .insert({ match_id: matchId, sender_id: user.id, text: clean })
      .select()
      .single()

    if (error) {
      logger.error('Failed to send message', { error: error.message, matchId, userId: user.id })
      return apiError("Erreur lors de l'envoi", 500)
    }

    return apiResponse(message)
  } catch (err) {
    return apiServerError(err)
  }
}
