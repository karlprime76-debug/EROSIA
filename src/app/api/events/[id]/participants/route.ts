import { NextRequest, NextResponse } from 'next/server'
import { getParticipants } from '@/lib/events'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await getParticipants(id)

  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ data })
}
