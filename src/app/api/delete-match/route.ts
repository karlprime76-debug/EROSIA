import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'
import { deleteMatchSchema } from '@/lib/validations'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    let body: Record<string, unknown>
    try { body = await request.json() } catch { return apiError('Corps de requête invalide') }
    const parsed = deleteMatchSchema.safeParse(body)
    if (!parsed.success) return apiError('matchId requis')
    const { matchId } = parsed.data

    const admin = createAdminClient()

    // Nettoyer les fichiers storage associés aux messages de ce match
    const { data: messages } = await admin
      .from('messages')
      .select('image_url, audio_url')
      .eq('match_id', matchId)

    if (messages && messages.length > 0) {
      const paths: { bucket: string; path: string }[] = []
      for (const msg of messages) {
        if (msg.image_url) {
          const p = extractStoragePath(msg.image_url, 'chat_photos')
          if (p) paths.push({ bucket: 'chat_photos', path: p })
        }
        if (msg.audio_url) {
          const p = extractStoragePath(msg.audio_url, 'chat_audio')
          if (p) paths.push({ bucket: 'chat_audio', path: p })
        }
      }
      await Promise.all(paths.map(({ bucket, path }) =>
        admin.storage.from(bucket).remove([path]).catch(e =>
          logger.error('Failed to remove storage file on match delete', { bucket, path, error: String(e) })
        )
      ))
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc('delete_match', {
      match_id: matchId,
    })

    if (rpcError || rpcResult?.error) {
      return apiError(rpcResult?.error ?? 'Erreur lors de la suppression', 500)
    }

    return apiResponse({ ok: true })
  } catch (err) {
    logger.error('Delete match error', { error: String(err) })
    return apiServerError(err)
  }
}

function extractStoragePath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length)
}
