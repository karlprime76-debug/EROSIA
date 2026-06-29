import { NextRequest, NextResponse } from 'next/server'
import { getEvents, createEvent, type CreateEventInput, type EventFilters } from '@/lib/events'

export async function GET(req: NextRequest) {
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

  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ data, page }, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  })
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()

  const input: CreateEventInput = {
    title: formData.get('title') as string,
    description: formData.get('description') as string | undefined,
    location: formData.get('location') as string | undefined,
    event_date: formData.get('event_date') as string | undefined,
    max_participants: formData.get('max_participants')
      ? parseInt(formData.get('max_participants') as string, 10)
      : undefined,
    category: formData.get('category') as CreateEventInput['category'],
  }

  const file = formData.get('image') as File | null

  if (!input.title?.trim()) {
    return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 })
  }

  const { data, error } = await createEvent(input, file ?? undefined)

  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
