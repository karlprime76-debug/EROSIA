import { NextRequest, NextResponse } from 'next/server'
import { getPresence } from '@/lib/social'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params

  const { data, error } = await getPresence(roomId)

  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ presence: data })
}
