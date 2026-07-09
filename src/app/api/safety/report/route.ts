import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reportSchema } from '@/lib/validations'
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }
    const parsed = reportSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { reported_id, reason, description, match_id, message_id } = parsed.data

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      reported_id,
      reason,
      description: description || null,
      match_id: match_id || null,
      message_id: message_id || null,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('consent_log').insert({
      user_id: user.id,
      action_type: 'report_submitted',
      target_user_id: reported_id,
      metadata: { reason },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Safety report POST error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
