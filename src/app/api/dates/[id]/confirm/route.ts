import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dateId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const { data: date, error: dateErr } = await supabase
      .from('planned_dates').select('*').eq('id', dateId).maybeSingle()
    if (dateErr || !date) return apiError('Rendez-vous introuvable', 404)
    if (user.id !== date.proposer_id && user.id !== date.proposee_id) {
      return apiError('Non autorisé', 403)
    }
    if (date.status !== 'accepted') {
      return apiError('Le rendez-vous doit d\'abord être accepté')
    }

    const admin = createAdminClient()
    await admin.from('planned_dates')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', dateId)
    return apiResponse({ status: 'confirmed' })
  } catch (err) {
    return apiServerError(err)
  }
}
