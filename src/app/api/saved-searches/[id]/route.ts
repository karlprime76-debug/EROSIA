import { createClient } from '@/lib/supabase/server'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)
    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return apiError('Corps de requête invalide', 400)
    }
    const { name, filters } = body
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name) updates.name = name
    if (filters) updates.filters = filters
    const { data, error } = await supabase.from('saved_searches').update(updates).eq('id', id).eq('user_id', user.id).select().single()
    if (error) return apiError(error.message, 500)
    return apiResponse(data)
  } catch (err) {
    return apiServerError(err)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)
    const { error } = await supabase.from('saved_searches').delete().eq('id', id).eq('user_id', user.id)
    if (error) return apiError(error.message, 500)
    return apiResponse({ ok: true })
  } catch (err) {
    return apiServerError(err)
  }
}
