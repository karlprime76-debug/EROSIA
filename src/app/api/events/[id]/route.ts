import { NextRequest, NextResponse } from 'next/server'
import { getEventById, deleteEvent } from '@/lib/events'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const { data, error } = await getEventById(id)

    if (error) return NextResponse.json({ error: String(error ?? 'Erreur') }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })

    return NextResponse.json({ data }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    })
  } catch (err) {
    logger.error('Events[id] GET error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { error } = await deleteEvent(id)

    if (error) return NextResponse.json({ error: String(error ?? 'Erreur') }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Events[id] DELETE error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
