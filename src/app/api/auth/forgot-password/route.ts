import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'
const forgotSchema = z.object({
  email: z.string().email('Email invalide'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = forgotSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return apiError(firstError)
    }

    const supabase = await createClient()
    const origin = process.env.NEXT_PUBLIC_SITE_URL || `https://${request.headers.get('host') || 'localhost:3000'}`
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${origin}/reset-password`,
    })

    if (error) {
      logger.error('Forgot password error', { error: error.message })
      return apiError('Erreur lors de l\'envoi du lien', 500)
    }

    return apiResponse({ ok: true })
  } catch (err) {
    return apiServerError(err)
  }
}
