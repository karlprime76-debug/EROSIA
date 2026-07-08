import { NextResponse } from 'next/server'
import { getSpaces } from '@/lib/social-space'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data, error } = await getSpaces()
    if (error) return NextResponse.json({ error: String(error ?? 'Erreur') }, { status: 400 })
    return NextResponse.json({ spaces: data }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch (err) {
    logger.error('Social spaces list error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
