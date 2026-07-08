import { NextResponse } from 'next/server'
import { getRooms } from '@/lib/social'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data, error } = await getRooms()

    if (error) return NextResponse.json({ error: error ?? 'Erreur' }, { status: 500 })

    return NextResponse.json({ rooms: data }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    })
  } catch (err) {
    logger.error('Social rooms GET error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
