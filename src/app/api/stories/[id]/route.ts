import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStoryById, deleteStory } from '@/lib/stories'
import { z } from 'zod'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

const uuidParam = z.string().uuid()

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const { id } = await params
    const idParsed = uuidParam.safeParse(id)
    if (!idParsed.success) return apiError('ID invalide', 400)
    const { data, error } = await getStoryById(idParsed.data)
    if (error) return apiError(String(error ?? 'Erreur'), 400)
    if (!data) return apiError('Story introuvable', 404)
    return NextResponse.json({ data: { story: data } }, {
      headers: { 'Cache-Control': 'private, s-maxage=15, stale-while-revalidate=30' },
    })
  } catch (err) {
    return apiServerError(err)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const { id } = await params
    const idParsed = uuidParam.safeParse(id)
    if (!idParsed.success) return apiError('ID invalide', 400)
    const { data: story } = await getStoryById(idParsed.data)
    if (!story) return apiError('Story introuvable', 404)
    if (story.user_id !== user.id) return apiError('Non autorisé', 403)

    const { error } = await deleteStory(idParsed.data)
    if (error) return apiError(String(error ?? 'Erreur'), 400)
    return apiResponse({ success: true })
  } catch (err) {
    return apiServerError(err)
  }
}
