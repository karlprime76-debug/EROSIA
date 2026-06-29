import { NextRequest, NextResponse } from 'next/server'
import { getAllZones, getZone } from '@/lib/world'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
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
}
