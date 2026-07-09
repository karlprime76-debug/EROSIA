import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addStoryView } from '@/lib/stories'
import { logger } from '@/lib/logger'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params
    const { error } = await addStoryView(id)
    if (error) return NextResponse.json({ error: String(error ?? 'Erreur') }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Story view error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
