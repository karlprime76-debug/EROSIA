import { NextRequest, NextResponse } from 'next/server'
import { joinEvent } from '@/lib/events'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await joinEvent(id)

  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
