import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStoryById, deleteStory } from '@/lib/stories'
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
    const { data, error } = await getStoryById(id)
    if (error) return NextResponse.json({ error: error ?? 'Erreur' }, { status: 400 })
    if (!data) return NextResponse.json({ error: 'Story introuvable' }, { status: 404 })
    return NextResponse.json({ story: data })
  } catch (err) {
    logger.error('Get story error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { error } = await deleteStory(id)
    if (error) return NextResponse.json({ error: error ?? 'Erreur' }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Delete story error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
