import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { proposeDateSchema } from '@/lib/validations'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const parsed = proposeDateSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { matchId, category, slots, location, note } = parsed.data

    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .eq('id', matchId)
      .maybeSingle()
    if (matchErr || !match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })
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
      return NextResponse.json({ error: 'Erreur lors de la création du rendez-vous' }, { status: 500 })
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
      return NextResponse.json({ error: 'Erreur lors de la création des créneaux' }, { status: 500 })
    }

    return NextResponse.json({ data: dateRecord }, { status: 201 })
  } catch (err) {
    logger.error('Date propose POST error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
