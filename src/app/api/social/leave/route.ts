import { NextResponse } from 'next/server'
import { leaveSpace } from '@/lib/social-space'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    const { error } = await leaveSpace()
    if (error) return NextResponse.json({ error: error ?? 'Erreur' }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Leave space error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
