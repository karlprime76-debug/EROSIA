import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, '8 caractères minimum'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return apiError(firstError)
    }

    const { email, password } = parsed.data
    const supabase = await createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      logger.warn('Login failed', { email: email.replace(/(?<=.).(?=.*@)/g, '*'), error: authError.message })
      const message = authError.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect'
        : authError.message === 'Email not confirmed'
          ? 'Email non confirmé — vérifie ta boîte mail'
          : 'Email ou mot de passe incorrect'
      return apiError(message, 401)
    }

    return apiResponse({ ok: true })
  } catch (err) {
    return apiServerError(err)
  }
}
