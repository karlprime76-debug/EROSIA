import { NextRequest, NextResponse } from 'next/server'
import { getEventById, deleteEvent } from '@/lib/events'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await getEventById(id)

  if (error) return NextResponse.json({ error }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })

  return NextResponse.json({ data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await deleteEvent(id)

  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ success: true })
}
