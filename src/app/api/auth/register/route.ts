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

    // Créer l'utilisateur auth via RPC direct (contourne GoTrue, auto-confirme l'email)
    const { data: userId, error: rpcError } = await admin.rpc('create_auth_user', {
      p_email: email,
      p_password: password,
    })
    if (rpcError || !userId) {
      logger.error('RPC create_auth_user failed', { error: rpcError?.message })
      return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 400 })
    }

    const { error: profileError } = await createProfile(String(userId), name, age)
    if (profileError) {
      logger.error('Profile creation failed', { userId, error: profileError.message })
      return NextResponse.json({ error: 'Erreur lors de la création du profil' }, { status: 400 })
    }

    if (referralCode) {
      const refResult = await applyReferralCode(referralCode.toUpperCase(), String(userId))
      if (refResult.error) {
        logger.warn('Referral code application failed', { userId, code: referralCode, error: refResult.error })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('Register route error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
