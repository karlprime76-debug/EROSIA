import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStoryReactions } from '@/lib/stories'
import { logger } from '@/lib/logger'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const { data, error } = await getStoryReactions(id)
    if (error) return NextResponse.json({ error: error ?? 'Erreur' }, { status: 400 })
    return NextResponse.json({ reactions: data })
  } catch (err) {
    logger.error('Story reactions list error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
