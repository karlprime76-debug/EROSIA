import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dateId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: date, error: dateErr } = await supabase
      .from('planned_dates').select('*').eq('id', dateId).maybeSingle()
    if (dateErr || !date) return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 })
    if (user.id !== date.proposer_id && user.id !== date.proposee_id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }
    if (date.status !== 'accepted') {
      return NextResponse.json({ error: 'Le rendez-vous doit d\'abord être accepté' }, { status: 400 })
    }

    const admin = createAdminClient()
    await admin.from('planned_dates')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', dateId)
    return NextResponse.json({ data: { status: 'confirmed' } })
  } catch (err) {
    logger.error('Date confirm POST error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
