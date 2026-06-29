import { NextRequest, NextResponse } from 'next/server'
import { getParticipants } from '@/lib/events'
import { logger } from '@/lib/logger'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { data, error } = await getParticipants(id)

    if (error) return NextResponse.json({ error }, { status: 500 })

    return NextResponse.json({ data })
  } catch (err) {
    logger.error('Events participants GET error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
