import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
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
      return NextResponse.json({ error: firstError }, { status: 400 })
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
      return NextResponse.json({ error: message }, { status: 401 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('Login route error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
