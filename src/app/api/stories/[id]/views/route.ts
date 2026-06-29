import { NextResponse } from 'next/server'
import { getStoryViews } from '@/lib/stories'
import { logger } from '@/lib/logger'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { data, error } = await getStoryViews(id)
    if (error) return NextResponse.json({ error }, { status: 400 })
    return NextResponse.json({ views: data })
  } catch (err) {
    logger.error('Story views list error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
