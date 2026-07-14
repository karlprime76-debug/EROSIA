import { NextRequest } from 'next/server'
import { getEvents, createEvent, type CreateEventInput, type EventFilters } from '@/lib/events'
import { validateFile } from '@/lib/media'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { createEventSchema } from '@/lib/validations'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const filters: EventFilters = {}

    const category = searchParams.get('category')
    if (category) filters.category = category as EventFilters['category']

    const dateFrom = searchParams.get('dateFrom')
    if (dateFrom) filters.dateFrom = dateFrom

    const dateTo = searchParams.get('dateTo')
    if (dateTo) filters.dateTo = dateTo

    const query = searchParams.get('query')
    if (query) filters.query = query

    const { data, error } = await getEvents(filters, page)

    if (error) return apiError(String(error ?? 'Erreur'), 500)

    const res = apiResponse({ data, page })
    res.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    return res
  } catch (err) {
    logger.error('Events GET error', { error: String(err) })
    return apiServerError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const formData = await req.formData()

    const body = {
      title: formData.get('title') as string,
      description: formData.get('description') as string | undefined,
      date: formData.get('event_date') as string | undefined,
      location: formData.get('location') as string | undefined,
      max_participants: formData.get('max_participants')
        ? parseInt(formData.get('max_participants') as string, 10)
        : undefined,
      category: formData.get('category') as string | undefined,
    }

    const parsed = createEventSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return apiError(firstError)
    }

    const input: CreateEventInput = {
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      event_date: parsed.data.date,
      max_participants: parsed.data.max_participants,
      category: parsed.data.category as CreateEventInput['category'],
    }

    const file = formData.get('image') as File | null

    if (file) {
      const err = validateFile(file, 'photo')
      if (err) return apiError(err)
    }

    const { data, error } = await createEvent(input, file ?? undefined)

    if (error) return apiError(String(error ?? 'Erreur'), 500)

    return apiResponse(data, 201)
  } catch (err) {
    logger.error('Events POST error', { error: String(err) })
    return apiServerError(err)
  }
}
