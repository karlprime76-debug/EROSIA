import { NextRequest, NextResponse } from 'next/server'
import { updatePosition } from '@/lib/social'
import { logger } from '@/lib/logger'
import type { Animation } from '@/lib/social'

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { x, y, z, rotation_y, animation } = body

    if (x === undefined || y === undefined || z === undefined) {
      return NextResponse.json({ error: 'x, y, z requis' }, { status: 400 })
    }

    const { error } = await updatePosition(x, y, z, rotation_y, animation as Animation | undefined)

    if (error) return NextResponse.json({ error: error ?? 'Erreur' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Social position PUT error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
