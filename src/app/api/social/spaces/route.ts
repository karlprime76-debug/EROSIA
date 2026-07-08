import { NextResponse } from 'next/server'
import { getSpaces } from '@/lib/social-space'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const { data, error } = await getSpaces()
    if (error) return NextResponse.json({ error: error ?? 'Erreur' }, { status: 400 })
    return NextResponse.json({ spaces: data })
  } catch (err) {
    logger.error('Social spaces list error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
