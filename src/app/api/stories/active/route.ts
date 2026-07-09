import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveStories } from '@/lib/stories'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const revalidate = 30

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '1', 10)

    const origin = new URL(request.url).origin
    const { data, error } = await getActiveStories(page, { baseUrl: origin })
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
