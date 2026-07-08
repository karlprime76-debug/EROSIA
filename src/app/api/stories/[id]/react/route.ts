import { NextResponse } from 'next/server'
import { addStoryReaction } from '@/lib/stories'
import { logger } from '@/lib/logger'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { emoji } = await request.json()
    if (!emoji) return NextResponse.json({ error: 'emoji requis' }, { status: 400 })

    const { error } = await addStoryReaction(id, emoji)
    if (error) return NextResponse.json({ error: String(error ?? 'Erreur') }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Story reaction error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
