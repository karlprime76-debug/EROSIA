import { NextResponse } from 'next/server'
import { updatePosition } from '@/lib/social-space'
import { logger } from '@/lib/logger'

export async function PUT(request: Request) {
  try {
    const { x, y, z, rotationY, animation } = await request.json()
    if (x === undefined || y === undefined || z === undefined) {
      return NextResponse.json({ error: 'x, y, z requis' }, { status: 400 })
    }

    const { error } = await updatePosition(x, y, z, rotationY, animation)
    if (error) return NextResponse.json({ error: error ?? 'Erreur' }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Position update error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
