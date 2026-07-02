import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { registerSchema } from '@/lib/validations'
import { sanitize } from '@/lib/sanitize'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { email, password, name, age } = parsed.data

    const supabase = await createClient()

    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? request.headers.get('origin') ?? 'http://localhost:3000'

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    })

    if (authError || !authData.user) {
      const msg = authError?.message ?? 'Inscription échouée'
      logger.warn('Signup failed', { error: msg })
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error: profileError } = await admin.from('profiles').insert({
      id: authData.user.id, name: sanitize(name), age, photos: [], interests: [],
    })

    if (profileError) {
      logger.error('Profile creation failed', { userId: authData.user.id, error: profileError.message })
      return NextResponse.json({ error: 'Erreur lors de la création du profil' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('Register route error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
