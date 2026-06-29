import { NextRequest, NextResponse } from 'next/server'
import { joinRoom } from '@/lib/social'

export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  const body = await req.json().catch(() => ({}))
  const { x, y, z, rotation_y, animation } = body

  const { data, error } = await joinRoom(roomId, {
    x: x ?? 0, y: y ?? 0, z: z ?? 0,
    rotation_y,
    animation,
  })

  if (error) return NextResponse.json({ error }, { status: 400 })

  return NextResponse.json({ presence: data }, { status: 201 })
}
