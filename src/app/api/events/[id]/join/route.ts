import { NextRequest, NextResponse } from 'next/server'
import { joinEvent } from '@/lib/events'
import { logger } from '@/lib/logger'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { data, error } = await joinEvent(id)

    if (error) return NextResponse.json({ error: String(error ?? 'Erreur') }, { status: 500 })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    logger.error('Events join POST error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
