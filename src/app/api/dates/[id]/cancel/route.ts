import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dateId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const reason = body?.reason ?? null

    const { data: date, error: dateErr } = await supabase
      .from('planned_dates').select('*').eq('id', dateId).maybeSingle()
    if (dateErr || !date) return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 })
    if (user.id !== date.proposer_id && user.id !== date.proposee_id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }
    if (date.status === 'completed' || date.status === 'declined') {
      return NextResponse.json({ error: 'Impossible d\'annuler' }, { status: 400 })
    }

    const admin = createAdminClient()
    await admin.from('planned_dates')
      .update({ status: 'cancelled', cancelled_by: user.id, cancel_reason: reason })
      .eq('id', dateId)
    return NextResponse.json({ data: { status: 'cancelled' } })
  } catch (err) {
    logger.error('Date cancel POST error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
