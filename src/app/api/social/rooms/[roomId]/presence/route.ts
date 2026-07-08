import { NextRequest, NextResponse } from 'next/server'
import { getPresence } from '@/lib/social'
import { logger } from '@/lib/logger'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params

    const { data, error } = await getPresence(roomId)

    if (error) return NextResponse.json({ error: error ?? 'Erreur' }, { status: 500 })

    return NextResponse.json({ presence: data })
  } catch (err) {
    logger.error('Social presence GET error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
