import { createClient } from '@/lib/supabase/server'
import { addStoryReaction } from '@/lib/stories'
import { z } from 'zod'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

const uuidParam = z.string().uuid()

const reactSchema = z.object({
  emoji: z.string().min(1, 'emoji requis'),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const { id } = await params
    const idParsed = uuidParam.safeParse(id)
    if (!idParsed.success) return apiError('ID invalide', 400)
    let body: Record<string, unknown>
    try { body = await request.json() } catch {
      return apiError('Corps de requête invalide', 400)
    }
    const parsed = reactSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return apiError(firstError, 400)
    }
    const { emoji } = parsed.data

    const { error } = await addStoryReaction(idParsed.data, emoji)
    if (error) return apiError(String(error ?? 'Erreur'), 400)

    return apiResponse({ success: true })
  } catch (err) {
    return apiServerError(err)
  }
}
