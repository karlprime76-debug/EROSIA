import { NextRequest } from 'next/server'
import { getEventById, deleteEvent } from '@/lib/events'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const { id } = await params
    const { data, error } = await getEventById(id)

    if (error) return apiError(String(error ?? 'Erreur'), 500)
    if (!data) return apiError('Événement introuvable', 404)

    const res = apiResponse(data)
    res.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    return res
  } catch (err) {
    logger.error('Events[id] GET error', { error: String(err) })
    return apiServerError(err)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const { id } = await params
    const { data: event } = await getEventById(id)
    if (!event) return apiError('Événement introuvable', 404)
    if (event.creator_id !== user.id) return apiError('Non autorisé', 403)

    const { error } = await deleteEvent(id)

    if (error) return apiError(String(error ?? 'Erreur'), 500)

    return apiResponse({ success: true })
  } catch (err) {
    logger.error('Events[id] DELETE error', { error: String(err) })
    return apiServerError(err)
  }
}
