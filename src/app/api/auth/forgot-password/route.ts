import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { verifyTurnstile, turnstileGuard } from '@/lib/turnstile'

const forgotSchema = z.object({
  email: z.string().email('Email invalide'),
  turnstileToken: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = forgotSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    if (turnstileGuard(parsed.data.turnstileToken)) {
      const result = await verifyTurnstile(parsed.data.turnstileToken ?? '')
      if (!result.ok) {
        return NextResponse.json({ error: 'Vérification de sécurité échouée. Recharge la page ou réessaie.' }, { status: 403 })
      }
    }

    const supabase = await createClient()
    const origin = process.env.NEXT_PUBLIC_SITE_URL || `https://${request.headers.get('host') || 'localhost:3000'}`
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${origin}/reset-password`,
    })

    if (error) {
      logger.error('Forgot password error', { error: error.message })
      return NextResponse.json({ error: 'Erreur lors de l\'envoi du lien' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('Forgot password route error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
