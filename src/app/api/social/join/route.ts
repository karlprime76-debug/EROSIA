import { NextResponse } from 'next/server'
import { joinSpace } from '@/lib/social-space'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const { spaceId, x, y, z } = await request.json()
    if (!spaceId) return NextResponse.json({ error: 'spaceId requis' }, { status: 400 })

    const { data, error } = await joinSpace(spaceId, x, y, z)
    if (error) return NextResponse.json({ error }, { status: 400 })

    return NextResponse.json({ presence: data })
  } catch (err) {
    logger.error('Join space error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
