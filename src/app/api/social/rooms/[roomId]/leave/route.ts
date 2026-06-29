import { NextRequest, NextResponse } from 'next/server'
import { leaveRoom } from '@/lib/social'

export async function POST(_req: NextRequest) {
  const { error } = await leaveRoom()

  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ success: true })
}
