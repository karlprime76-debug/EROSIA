import { NextRequest, NextResponse } from 'next/server'
import { getRoomById, getPresence } from '@/lib/social'
import { logger } from '@/lib/logger'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params

    const [roomResult, presenceResult] = await Promise.all([
      getRoomById(roomId),
      getPresence(roomId),
    ])

    if (roomResult.error) return NextResponse.json({ error: roomResult.error }, { status: 500 })
    if (!roomResult.data) return NextResponse.json({ error: 'Salon introuvable' }, { status: 404 })

    return NextResponse.json({
      room: roomResult.data,
      presence: presenceResult.data,
    })
  } catch (err) {
    logger.error('Social roomId GET error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
