import { NextResponse } from 'next/server'
import { getPresence } from '@/lib/social-space'
import { logger } from '@/lib/logger'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  try {
    const { spaceId } = await params
    const { data, error } = await getPresence(spaceId)
    if (error) return NextResponse.json({ error: error ?? 'Erreur' }, { status: 400 })
    return NextResponse.json({ presence: data })
  } catch (err) {
    logger.error('Space presence error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
