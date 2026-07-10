import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { verifyTurnstile, turnstileGuard } from '@/lib/turnstile'

const resetSchema = z.object({
  password: z.string().min(8, '8 caractères minimum'),
  turnstileToken: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = resetSchema.safeParse(body)
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
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Session invalide — le lien a peut-être expiré' }, { status: 401 })
    }

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
    if (error) {
      logger.error('Reset password error', { error: error.message })
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('Reset password route error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
