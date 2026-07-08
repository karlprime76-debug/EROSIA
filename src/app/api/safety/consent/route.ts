import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    if (!body.action_type || typeof body.action_type !== 'string') {
      return NextResponse.json({ error: 'action_type requis' }, { status: 400 })
    }

    const { error } = await supabase.from('consent_log').insert({
      user_id: user.id,
      action_type: body.action_type,
      target_user_id: body.target_user_id || null,
      metadata: body.metadata || {},
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Route error', { error: String(err) })
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
    logger.error('Route error', { error: String(err) })
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
    logger.error('Route error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
