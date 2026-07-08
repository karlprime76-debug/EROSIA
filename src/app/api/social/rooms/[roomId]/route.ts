import { NextRequest, NextResponse } from 'next/server'
import { getRoomById, getPresence } from '@/lib/social'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { roomId } = await params

    const [roomResult, presenceResult] = await Promise.all([
      getRoomById(roomId),
      getPresence(roomId),
    ])

    if (roomResult.error) return NextResponse.json({ error: String(roomResult.error ?? 'Erreur') }, { status: 500 })
    if (!roomResult.data) return NextResponse.json({ error: 'Salon introuvable' }, { status: 404 })

    return NextResponse.json({
      room: roomResult.data,
      presence: presenceResult.data,
    }, {
      headers: { 'Cache-Control': 'private, s-maxage=10, stale-while-revalidate=30' },
    })
  } catch (err) {
    logger.error('Social roomId GET error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
