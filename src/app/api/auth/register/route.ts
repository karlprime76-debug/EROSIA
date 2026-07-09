import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { registerSchema } from '@/lib/validations'
import { sanitize } from '@/lib/sanitize'
import { logger } from '@/lib/logger'

const admin = createAdminClient()

async function createProfile(userId: string, name: string, age: number) {
  return admin.from('profiles').insert({
    id: userId, name: sanitize(name), age, photos: [], interests: [],
  })
}

async function applyReferralCode(code: string, newUserId: string): Promise<{ error?: string }> {
  const { data, error } = await admin.rpc('apply_referral_code', {
    p_code: code,
    p_user_id: newUserId,
  })
  if (error) return { error: "Erreur lors de l'application du code de parrainage" }
  if (data?.error) return { error: data.error }
  return {}
}

async function signupViaGoTrue(email: string, password: string, origin: string) {
  const supabase = await createClient()
  return supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })
}

async function signupViaRPC(email: string, password: string): Promise<{ userId?: string; error?: string }> {
  const { data, error } = await admin.rpc('create_auth_user', {
    p_email: email,
    p_password: password,
  })
  if (error) return { error: `Erreur lors de l'inscription (${error.message})` }
  if (!data) return { error: "Erreur lors de l'inscription" }
  return { userId: String(data) }
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
    const referralCode: string | undefined = body.referralCode
    const rawOrigin = process.env.NEXT_PUBLIC_SITE_URL; if (!rawOrigin) return NextResponse.json({ error: 'Erreur de configuration serveur' }, { status: 500 })
    const origin = rawOrigin.replace(/\/+$/, '')

    // Étape 1 : créer l'utilisateur auth (GoTrue, fallback RPC direct)
    let userId: string | undefined
    let needEmailConfirm = false

    const { data: authData, error: authError } = await signupViaGoTrue(email, password, origin)
    if (authError || !authData.user) {
      const err = authError as unknown as Record<string, unknown>
      const errJson = authError ? JSON.stringify(Object.getOwnPropertyNames(authError).reduce((acc, k) => { acc[k] = err[k]; return acc }, {} as Record<string, unknown>)) : 'null'
      logger.warn('GoTrue signup failed, falling back to RPC', { message: authError?.message, code: err.code, status: err.status, raw: errJson })

      const rpcResult = await signupViaRPC(email, password)
      if (rpcResult.error) {
        logger.error('RPC signup also failed', { error: rpcResult.error })
        return NextResponse.json({ error: rpcResult.error }, { status: 400 })
      }
      userId = rpcResult.userId
    } else {
      userId = authData.user.id
      needEmailConfirm = !authData.user.email_confirmed_at
    }

    if (!userId) return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 400 })

    // Étape 2 : créer le profil
    const { error: profileError } = await createProfile(userId, name, age)
    if (profileError) {
      logger.error('Profile creation failed', { userId, error: profileError.message })
      return NextResponse.json({ error: 'Erreur lors de la création du profil' }, { status: 400 })
    }

    if (referralCode) {
      const refResult = await applyReferralCode(referralCode.toUpperCase(), userId)
      if (refResult.error) {
        logger.warn('Referral code application failed', { userId, code: referralCode, error: refResult.error })
      }
    }

    return NextResponse.json({ ok: true, needEmailConfirm })
  } catch (err) {
    logger.error('Register route error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
