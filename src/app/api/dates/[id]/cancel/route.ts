import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dateId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const body = await request.json().catch(() => ({}))
    const reason = body?.reason ?? null

    const { data: date, error: dateErr } = await supabase
      .from('planned_dates').select('*').eq('id', dateId).maybeSingle()
    if (dateErr || !date) return apiError('Rendez-vous introuvable', 404)
    if (user.id !== date.proposer_id && user.id !== date.proposee_id) {
      return apiError('Non autorisé', 403)
    }
    if (date.status === 'completed' || date.status === 'declined') {
      return apiError('Impossible d\'annuler')
    }

    const admin = createAdminClient()
    await admin.from('planned_dates')
      .update({ status: 'cancelled', cancelled_by: user.id, cancel_reason: reason })
      .eq('id', dateId)
    return apiResponse({ status: 'cancelled' })
  } catch (err) {
    return apiServerError(err)
  }
}
