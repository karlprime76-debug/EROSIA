import { NextResponse } from 'next/server'
import { getRooms } from '@/lib/social'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await getRooms()

  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ rooms: data }, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  })
}
