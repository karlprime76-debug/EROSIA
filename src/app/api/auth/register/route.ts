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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { email, password, name, age, gender, interestedIn } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()
    const referralCode: string | undefined = body.referralCode

    if (referralCode && (typeof referralCode !== 'string' || referralCode.length > 20)) {
      return NextResponse.json({ error: 'Code de parrainage invalide' }, { status: 400 })
    }

    const { data: rpcResult, error: rpcError } = await admin.rpc('create_auth_user_with_profile', {
      p_email: normalizedEmail,
      p_password: password,
      p_name: sanitize(name, 80),
      p_age: age,
      p_gender: gender,
      p_interested_in: interestedIn,
    })

    if (rpcError || !rpcResult) {
      logger.error('RPC create_auth_user_with_profile failed', { error: rpcError?.message, rpcResult })
      return NextResponse.json({ error: rpcError?.message?.includes('could not find a function') ? 'Erreur de configuration serveur — contacte le support' : "Erreur lors de l'inscription" }, { status: 500 })
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
      email: normalizedEmail,
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
