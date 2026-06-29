import { NextRequest, NextResponse } from 'next/server'
import { getAllZones, getZone } from '@/lib/world'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const zoneId = searchParams.get('zoneId')

    if (zoneId) {
      const zone = getZone(zoneId as any)
      if (!zone) return NextResponse.json({ error: 'Zone introuvable' }, { status: 404 })
      return NextResponse.json({ zone })
    }

    return NextResponse.json({ zones: getAllZones() }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch (err) {
    logger.error('World zones GET error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
