import { createClient } from '@/lib/supabase/server'
import { blockSchema } from '@/lib/validations'
import { logger } from '@/lib/logger'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return apiError('Corps de requête invalide')
    }
    const parsed = blockSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return apiError(firstError)
    }

    const { blocked_id } = parsed.data

    if (blocked_id === user.id) {
      return apiError('Vous ne pouvez pas vous bloquer vous-même')
    }

    const { error } = await supabase.from('blocked_users').upsert(
      { blocker_id: user.id, blocked_id },
      { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: false },
    )

    if (error) return apiError(error.message)

    await supabase.from('consent_log').insert({
      user_id: user.id,
      action_type: 'user_blocked',
      target_user_id: blocked_id,
    })

    return apiResponse({ success: true })
  } catch (err) {
    logger.error('Safety block POST error', { error: String(err) })
    return apiServerError(err)
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return apiError('Corps de requête invalide')
    }
    const parsed = blockSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return apiError(firstError)
    }

    const { blocked_id } = parsed.data

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blocked_id)

    if (error) return apiError(error.message)

    await supabase.from('consent_log').insert({
      user_id: user.id,
      action_type: 'user_unblocked',
      target_user_id: blocked_id,
    })

    return apiResponse({ success: true })
  } catch (err) {
    logger.error('Safety block DELETE error', { error: String(err) })
    return apiServerError(err)
  }
}
