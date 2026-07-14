import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dateId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    let body: Record<string, unknown>
    try { body = await request.json() } catch {
      return apiError('Corps de requête invalide')
    }
    const { accept, slotId } = body
    if (typeof accept !== 'boolean') return apiError('accept requis')

    const { data: date, error: dateErr } = await supabase
      .from('planned_dates').select('*').eq('id', dateId).maybeSingle()
    if (dateErr || !date) return apiError('Rendez-vous introuvable', 404)
    if (date.proposee_id !== user.id) return apiError('Non autorisé', 403)
    if (date.status !== 'pending') return apiError('Déjà répondu')

    const admin = createAdminClient()
    if (!accept) {
      await admin.from('planned_dates').update({ status: 'declined' }).eq('id', dateId)
      return apiResponse({ status: 'declined' })
    }
    if (!slotId) return apiError('slotId requis pour accepter')

    await admin.from('date_slots').update({ accepted: false }).eq('date_id', dateId)
    await admin.from('date_slots').update({ accepted: true }).eq('id', slotId)
    await admin.from('planned_dates').update({ status: 'accepted' }).eq('id', dateId)
    return apiResponse({ status: 'accepted' })
  } catch (err) {
    logger.error('Date respond PATCH error', { error: String(err) })
    return apiServerError(err)
  }
}
