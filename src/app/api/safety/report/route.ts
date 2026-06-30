import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json()
  if (!body.reported_id || !body.reason) {
    return NextResponse.json({ error: 'reported_id et reason requis' }, { status: 400 })
  }

  const allowedReasons = [
    'comportement_inapproprié',
    'harcèlement',
    'contenu_offensant',
    'faux_profil',
    'demande_argent',
    'spam',
    'autre',
  ]
  if (!allowedReasons.includes(body.reason)) {
    return NextResponse.json({ error: 'Motif invalide' }, { status: 400 })
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    reported_id: body.reported_id,
    reason: body.reason,
    description: body.description || null,
    match_id: body.match_id || null,
    message_id: body.message_id || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('consent_log').insert({
    user_id: user.id,
    action_type: 'report_submitted',
    target_user_id: body.reported_id,
    metadata: { reason: body.reason },
  })

  return NextResponse.json({ success: true })
}
