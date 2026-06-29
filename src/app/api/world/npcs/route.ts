import { NextRequest, NextResponse } from 'next/server'
import { generateNPCs, getNPCsByZone, getZone, type ZoneId } from '@/lib/world'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const zoneId = searchParams.get('zoneId')

    if (zoneId) {
      const zone = getZone(zoneId as ZoneId)
      if (!zone) return NextResponse.json({ error: 'Zone introuvable' }, { status: 404 })
      const npcs = getNPCsByZone(zone.id)
      return NextResponse.json({ npcs })
    }

    return NextResponse.json({ npcs: generateNPCs() }, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240' },
    })
  } catch (err) {
    logger.error('World NPCs GET error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
