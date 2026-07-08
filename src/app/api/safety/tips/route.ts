import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { logger } from '@/lib/logger'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    let query = supabase.from('safety_tips').select('*').order('priority', { ascending: false })

    if (category && ['dating', 'privacy', 'security', 'consent'].includes(category)) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, immutable' },
    })
  } catch (err) {
    logger.error('Safety tips GET error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
