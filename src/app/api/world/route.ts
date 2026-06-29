import { NextResponse } from 'next/server'
import { getAllZones, generateNPCs, WORLD_NAME, WORLD_DESCRIPTION, WORLD_VERSION } from '@/lib/world'

export const dynamic = 'force-dynamic'

export async function GET() {
  const zones = getAllZones()
  const npcs = generateNPCs()

  return NextResponse.json({
    name: WORLD_NAME,
    description: WORLD_DESCRIPTION,
    version: WORLD_VERSION,
    zoneCount: zones.length,
    npcCount: npcs.length,
    totalCapacity: zones.reduce((sum, z) => sum + z.capacity, 0),
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  })
}
