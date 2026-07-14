import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'
const resetSchema = z.object({
  password: z.string().min(8, '8 caractères minimum').max(128),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = resetSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return apiError(firstError)
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return apiError('Session invalide — le lien a peut-être expiré', 401)
    }

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
    if (error) {
      logger.error('Reset password error', { error: error.message })
      return apiError('Erreur lors de la mise à jour', 500)
    }

    return apiResponse({ ok: true })
  } catch (err) {
    return apiServerError(err)
  }
}
