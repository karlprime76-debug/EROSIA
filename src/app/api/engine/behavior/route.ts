import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { BehaviorAction } from '@/lib/engine'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { action, targetId, metadata } = body as {
      action: BehaviorAction
      targetId?: string
      metadata?: Record<string, unknown>
    }

    if (!action) return NextResponse.json({ error: 'action requis' }, { status: 400 })

    const { error } = await supabase.from('behavior_log').insert({
      user_id: user.id,
      action,
      target_id: targetId ?? null,
      metadata: metadata ?? null,
    })

    if (error) {
      logger.error('Failed to log behavior', { error: error.message, action, userId: user.id })
      return NextResponse.json({ error: 'Erreur lors de l\'enregistrement' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
