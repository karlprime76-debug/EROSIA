import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dateId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { accept, slotId } = body
    if (typeof accept !== 'boolean') return NextResponse.json({ error: 'accept requis' }, { status: 400 })

    const { data: date, error: dateErr } = await supabase
      .from('planned_dates').select('*').eq('id', dateId).maybeSingle()
    if (dateErr || !date) return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 })
    if (date.proposee_id !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    if (date.status !== 'pending') return NextResponse.json({ error: 'Déjà répondu' }, { status: 400 })

    const admin = createAdminClient()
    if (!accept) {
      await admin.from('planned_dates').update({ status: 'declined' }).eq('id', dateId)
      return NextResponse.json({ data: { status: 'declined' } })
    }
    if (!slotId) return NextResponse.json({ error: 'slotId requis pour accepter' }, { status: 400 })

    await admin.from('date_slots').update({ accepted: false }).eq('date_id', dateId)
    await admin.from('date_slots').update({ accepted: true }).eq('id', slotId)
    await admin.from('planned_dates').update({ status: 'accepted' }).eq('id', dateId)
    return NextResponse.json({ data: { status: 'accepted' } })
  } catch (err) {
    logger.error('Date respond PATCH error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
