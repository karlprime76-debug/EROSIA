import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { pushSubscribeSchema } from '@/lib/validations'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST(request: Request) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    let body: Record<string, unknown>
    try { body = await request.json() } catch {
      return apiError('Corps de requête invalide')
    }
    const parsed = pushSubscribeSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return apiError(firstError)
    }
    const { endpoint, keys } = parsed.data

    const admin = createAdminClient()
    const { error } = await admin.from('push_subscriptions').insert({
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    })

    if (error) return apiError('Erreur lors de l\'inscription aux notifications', 500)
    return apiResponse({ ok: true })
  } catch (err) {
    logger.error('Push subscribe error', { error: String(err) })
    return apiServerError(err)
  }
}

export async function DELETE(request: Request) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    let raw: Record<string, unknown>
    try { raw = await request.json() } catch {
      return apiError('Corps de requête invalide')
    }
    const parsed = z.object({ endpoint: z.string().url() }).safeParse(raw)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'endpoint requis'
      return apiError(firstError)
    }

    const admin = createAdminClient()
    const { data: sub } = await admin.from('push_subscriptions').select('user_id').eq('endpoint', parsed.data.endpoint).maybeSingle()
    if (!sub) return apiError('Abonnement introuvable', 404)
    if (sub.user_id !== user.id) return apiError('Non autorisé', 403)
    const { error } = await admin.from('push_subscriptions').delete().eq('endpoint', parsed.data.endpoint)
    if (error) return apiError('Erreur lors du désabonnement', 500)
    return apiResponse({ ok: true })
  } catch (err) {
    logger.error('Push subscribe error', { error: String(err) })
    return apiServerError(err)
  }
}
