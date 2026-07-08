import { NextResponse } from 'next/server'
import { getActiveStories } from '@/lib/stories'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const revalidate = 30

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '1', 10)

    const { data, error } = await getActiveStories(page)
    if (error) return NextResponse.json({ error: String(error ?? 'Erreur') }, { status: 400 })

    return NextResponse.json({ groups: data }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (err) {
    logger.error('Active stories error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
