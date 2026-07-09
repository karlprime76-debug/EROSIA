import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMyStories } from '@/lib/stories'
import { logger } from '@/lib/logger'

export const revalidate = 15

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data, error } = await getMyStories()
    if (error) return NextResponse.json({ error: String(error ?? 'Erreur') }, { status: 400 })

    return NextResponse.json({ stories: data }, {
      headers: { 'Cache-Control': 'private, s-maxage=15, stale-while-revalidate=30' },
    })
  } catch (err) {
    logger.error('My stories error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
