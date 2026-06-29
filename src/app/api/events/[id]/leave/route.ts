import { NextRequest, NextResponse } from 'next/server'
import { leaveEvent } from '@/lib/events'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await leaveEvent(id)

  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ success: true })
}
