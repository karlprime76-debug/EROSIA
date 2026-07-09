import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { behaviorSchema } from '@/lib/validations'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const parsed = behaviorSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
    }

    const { action, targetId, metadata } = parsed.data

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
  } catch (err) {
    logger.error('Behavior POST error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
