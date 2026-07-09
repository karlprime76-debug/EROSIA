import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { consentSchema } from '@/lib/validations'
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
    const parsed = consentSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { action_type, target_user_id, metadata } = parsed.data

    const { error } = await supabase.from('consent_log').insert({
      user_id: user.id,
      action_type,
      target_user_id: target_user_id || null,
      metadata: metadata || {},
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Consent POST error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

    const { data, error } = await supabase
      .from('consent_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    logger.error('Consent GET error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { error } = await supabase
      .from('consent_log')
      .delete()
      .eq('user_id', user.id)
      .eq('action_type', 'consent_revoked')

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('consent_log').insert({
      user_id: user.id,
      action_type: 'consent_revoked',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Consent DELETE error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
