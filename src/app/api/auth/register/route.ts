import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { registerSchema } from '@/lib/validations'
import { sanitize } from '@/lib/sanitize'
import { logger } from '@/lib/logger'
import { signToken } from '@/lib/custom-auth'

async function createUserViaGoTrue(email: string, password: string, origin: string) {
  const supabase = await createClient()
  return supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })
}

async function createUserViaRpc(email: string, password: string) {
  const admin = createAdminClient()
  return admin.rpc('create_auth_user', { p_email: email, p_password: password })
}

async function createProfile(userId: string, name: string, age: number) {
  const admin = createAdminClient()
  return admin.from('profiles').insert({
    id: userId, name: sanitize(name), age, photos: [], interests: [],
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { email, password, name, age } = parsed.data
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? request.headers.get('origin') ?? 'http://localhost:3000'

    const { data: authData, error: authError } = await createUserViaGoTrue(email, password, origin)

    if (authError || !authData.user) {
      logger.error('GoTrue signup failed — trying RPC fallback', { error: authError?.message })
      const { data: userId, error: rpcError } = await createUserViaRpc(email, password)
      if (rpcError || !userId) {
        logger.error('RPC fallback also failed', { error: rpcError?.message })
        return NextResponse.json({
          error: "Le service d'inscription est temporairement indisponible, réessaie plus tard",
        }, { status: 400 })
      }
      const { error: profileError } = await createProfile(userId as string, name, age)
      if (profileError) {
        logger.error('Profile creation failed after RPC', { userId, error: profileError.message })
        return NextResponse.json({ error: 'Erreur lors de la création du profil' }, { status: 400 })
      }
      const token = await signToken(userId as string, email)
      logger.error('RPC signup succeeded — returning autoLogin token', { userId })
      const rpcRes = NextResponse.json({ ok: true, autoLogin: true })
      rpcRes.cookies.set('custom_auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 604800,
      })
      return rpcRes
    }

    const { error: profileError } = await createProfile(authData.user.id, name, age)
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
