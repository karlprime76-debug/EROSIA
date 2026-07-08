import { NextRequest, NextResponse } from 'next/server'
import { getEventById, deleteEvent } from '@/lib/events'
import { logger } from '@/lib/logger'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { data, error } = await getEventById(id)

    if (error) return NextResponse.json({ error: error ?? 'Erreur' }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })

    return NextResponse.json({ data })
  } catch (err) {
    logger.error('Events[id] GET error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { error } = await deleteEvent(id)

    if (error) return NextResponse.json({ error: error ?? 'Erreur' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Events[id] DELETE error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
