import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    if (!body.blocked_id) {
      return NextResponse.json({ error: 'blocked_id requis' }, { status: 400 })
    }

    if (body.blocked_id === user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas vous bloquer vous-même' }, { status: 400 })
    }

    const { error } = await supabase.from('blocked_users').upsert(
      { blocker_id: user.id, blocked_id: body.blocked_id },
      { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: false },
    )

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('consent_log').insert({
      user_id: user.id,
      action_type: 'user_blocked',
      target_user_id: body.blocked_id,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Route error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    if (!body.blocked_id) {
      return NextResponse.json({ error: 'blocked_id requis' }, { status: 400 })
    }

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', body.blocked_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('consent_log').insert({
      user_id: user.id,
      action_type: 'user_unblocked',
      target_user_id: body.blocked_id,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Route error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
