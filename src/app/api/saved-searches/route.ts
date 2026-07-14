import { createClient } from '@/lib/supabase/server'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)
    const { data, error } = await supabase.from('saved_searches').select('*').order('created_at', { ascending: false })
    if (error) return apiError(error.message, 500)
    return apiResponse(data)
  } catch (err) {
    return apiServerError(err)
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)
    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return apiError('Corps de requête invalide', 400)
    }
    const { name, filters } = body
    if (!name || !filters) return apiError('name et filters requis', 400)
    const { data, error } = await supabase.from('saved_searches').insert({ user_id: user.id, name, filters }).select().single()
    if (error) return apiError(error.message, 500)
    return apiResponse(data, 201)
  } catch (err) {
    return apiServerError(err)
  }
}
