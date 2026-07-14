import { createClient } from '@/lib/supabase/server'
import { addStoryView } from '@/lib/stories'
import { z } from 'zod'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

const uuidParam = z.string().uuid()

export async function POST(
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
    const { error } = await addStoryView(idParsed.data)
    if (error) return apiError(String(error ?? 'Erreur'), 400)
    return apiResponse({ success: true })
  } catch (err) {
    return apiServerError(err)
  }
}
