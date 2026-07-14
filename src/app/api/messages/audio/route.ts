import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { validateFile } from '@/lib/media'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    let formData: FormData
    try { formData = await request.formData() } catch {
      return apiError('FormData invalide', 400)
    }

    const matchId = formData.get('matchId') as string | null
    const audioFile = formData.get('audio') as File | null

    if (!matchId || !audioFile) {
      return apiError('matchId et audio requis', 400)
    }

    const fileErr = validateFile(audioFile, 'audio')
    if (fileErr) return apiError(fileErr, 400)

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

    const { data: block } = await admin
      .from('blocks')
      .select('id')
      .eq('blocker_id', targetId)
      .eq('blocked_id', user.id)
      .maybeSingle()

    if (block) return apiError('Action non autorisée', 403)

    const fileName = `chat_audio/${matchId}/${Date.now()}-${user.id}.webm`
    const buffer = Buffer.from(await audioFile.arrayBuffer())

    const { error: uploadErr } = await admin.storage.from('chat_audio').upload(fileName, buffer, {
      contentType: audioFile.type,
      upsert: false,
    })

    if (uploadErr) {
      logger.error('Audio upload failed', { error: uploadErr.message, matchId, userId: user.id })
      return apiError("Erreur lors de l'upload", 500)
    }

    const { data: { publicUrl } } = admin.storage.from('chat_audio').getPublicUrl(fileName)

    const { data: message, error: insertErr } = await admin
      .from('messages')
      .insert({ match_id: matchId, sender_id: user.id, audio_url: publicUrl })
      .select()
      .single()

    if (insertErr) {
      logger.error('Audio message insert failed', { error: insertErr.message, matchId, userId: user.id })
      await admin.storage.from('chat_audio').remove([fileName])
      return apiError("Erreur lors de l'envoi", 500)
    }

    return apiResponse(message)
  } catch (err) {
    return apiServerError(err)
  }
}
