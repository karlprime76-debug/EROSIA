import { NextRequest, NextResponse } from 'next/server'
import { generateNPCs, getNPCsByZone } from '@/lib/world'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const zoneId = searchParams.get('zoneId')

  if (zoneId) {
    const npcs = getNPCsByZone(zoneId as any)
    return NextResponse.json({ npcs })
  }

  return NextResponse.json({ npcs: generateNPCs() }, {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240' },
  })
}
