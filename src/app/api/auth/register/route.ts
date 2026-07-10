import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { registerSchema } from '@/lib/validations'
import { sanitize } from '@/lib/sanitize'
import { logger } from '@/lib/logger'

const admin = createAdminClient()

async function applyReferralCode(code: string, newUserId: string): Promise<{ error?: string }> {
  const { data, error } = await admin.rpc('apply_referral_code', {
    p_code: code,
    p_user_id: newUserId,
  })
  if (error) return { error: "Erreur lors de l'application du code de parrainage" }
  if (data?.error) return { error: data.error }
  return {}
}

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    })
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}

const turnstileConfigured = !!process.env.TURNSTILE_SECRET_KEY && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (turnstileConfigured) {
      const turnstileToken = body.turnstileToken
      if (!turnstileToken || !(await verifyTurnstile(turnstileToken))) {
        return NextResponse.json({ error: 'Vérification de sécurité échouée' }, { status: 403 })
      }
    }

    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { email, password, name, age, gender, interestedIn } = parsed.data
    const referralCode: string | undefined = body.referralCode

    if (referralCode && (typeof referralCode !== 'string' || referralCode.length > 20)) {
      return NextResponse.json({ error: 'Code de parrainage invalide' }, { status: 400 })
    }

    const { data: rpcResult, error: rpcError } = await admin.rpc('create_auth_user_with_profile', {
      p_email: email,
      p_password: password,
      p_name: sanitize(name, 80),
      p_age: age,
      p_gender: gender,
      p_interested_in: interestedIn,
    })

    if (rpcError || !rpcResult) {
      logger.error('RPC create_auth_user_with_profile failed', { error: rpcError?.message })
      return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 500 })
    }

    if (rpcResult.error) {
      return NextResponse.json({ error: rpcResult.error }, { status: 409 })
    }

    const userId: string = rpcResult.user_id
    if (!userId) {
      return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 500 })
    }

    if (referralCode) {
      const refResult = await applyReferralCode(referralCode.toUpperCase(), userId)
      if (refResult.error) {
        logger.warn('Referral code application failed', { userId, code: referralCode, error: refResult.error })
      }
    }

    const supabase = await createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    })

    if (signInError) {
      logger.error('Auto-login failed after registration', { error: signInError.message, userId })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('Register route error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
