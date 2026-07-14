import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { proposeDateSchema } from '@/lib/validations'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    let body: Record<string, unknown>
    try { body = await request.json() } catch {
      return apiError('Corps de requête invalide')
    }
    const parsed = proposeDateSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return apiError(firstError)
    }

    const { matchId, category, slots, location, note } = parsed.data

    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .eq('id', matchId)
      .maybeSingle()
    if (matchErr || !match) return apiError('Match introuvable', 404)
    const proposeeId = match.user1_id === user.id ? match.user2_id : match.user1_id

    const admin = createAdminClient()
    const { data: dateRecord, error: insertErr } = await admin
      .from('planned_dates')
      .insert({
        match_id: matchId,
        proposer_id: user.id,
        proposee_id: proposeeId,
        category,
        location: location ?? null,
        note: note ?? null,
        status: 'pending',
      })
      .select()
      .single()
    if (insertErr) {
      logger.error('Failed to create planned_date', { error: insertErr.message })
      return apiError('Erreur lors de la création du rendez-vous', 500)
    }

    const slotRecords = slots.map(s => ({
      date_id: dateRecord.id,
      proposed_date: s.proposed_date,
      proposed_time: s.proposed_time,
    }))
    const { error: slotsErr } = await admin.from('date_slots').insert(slotRecords)
    if (slotsErr) {
      logger.error('Failed to insert date slots', { error: slotsErr.message })
      await admin.from('planned_dates').delete().eq('id', dateRecord.id)
      return apiError('Erreur lors de la création des créneaux', 500)
    }

    return apiResponse(dateRecord, 201)
  } catch (err) {
    logger.error('Date propose POST error', { error: String(err) })
    return apiServerError(err)
  }
}
