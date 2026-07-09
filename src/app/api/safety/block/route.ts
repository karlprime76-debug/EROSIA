import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { blockSchema } from '@/lib/validations'
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
    const parsed = blockSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { blocked_id } = parsed.data

    if (blocked_id === user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas vous bloquer vous-même' }, { status: 400 })
    }

    const { error } = await supabase.from('blocked_users').upsert(
      { blocker_id: user.id, blocked_id },
      { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: false },
    )

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('consent_log').insert({
      user_id: user.id,
      action_type: 'user_blocked',
      target_user_id: blocked_id,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Safety block POST error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }
    const parsed = blockSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { blocked_id } = parsed.data

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blocked_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('consent_log').insert({
      user_id: user.id,
      action_type: 'user_unblocked',
      target_user_id: blocked_id,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Safety block DELETE error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
