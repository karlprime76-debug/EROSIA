import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storyId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: story } = await supabase
      .from('stories').select('user_id').eq('id', storyId).maybeSingle()
    if (!story) return NextResponse.json({ error: 'Story introuvable' }, { status: 404 })
    if (story.user_id !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const admin = createAdminClient()
    const { error } = await admin.from('stories').update({ archived: true }).eq('id', storyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('Story archive error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
