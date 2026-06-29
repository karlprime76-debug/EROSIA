import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateIcebreaker } from '@/lib/icebreaker'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { targetId } = await request.json()
    if (!targetId) return NextResponse.json({ error: 'targetId requis' }, { status: 400 })

    const result = await generateIcebreaker({ userId: user.id, targetId })
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json({ suggestion: result.suggestion })
  } catch (err) {
    logger.error('Icebreaker route error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
