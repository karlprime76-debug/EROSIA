import { NextResponse } from 'next/server'
import { getStoryReactions } from '@/lib/stories'
import { logger } from '@/lib/logger'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { data, error } = await getStoryReactions(id)
    if (error) return NextResponse.json({ error }, { status: 400 })
    return NextResponse.json({ reactions: data })
  } catch (err) {
    logger.error('Story reactions list error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
