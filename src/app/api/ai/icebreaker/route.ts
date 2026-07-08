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

    const { data: matches } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .limit(100)
    const isMatched = matches?.some(m =>
      (m.user1_id === user.id && m.user2_id === targetId) ||
      (m.user1_id === targetId && m.user2_id === user.id)
    )
    if (!isMatched) return NextResponse.json({ error: 'Vous devez être en match' }, { status: 403 })

    const result = await generateIcebreaker({ userId: user.id, targetId })
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json({ suggestion: result.suggestion })
  } catch (err) {
    logger.error('Icebreaker route error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
