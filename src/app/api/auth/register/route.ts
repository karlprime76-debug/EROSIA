import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { registerSchema } from '@/lib/validations'
import { sanitize } from '@/lib/sanitize'
import { logger } from '@/lib/logger'

async function createProfile(userId: string, name: string, age: number) {
  const admin = createAdminClient()
  return admin.from('profiles').insert({
    id: userId, name: sanitize(name), age, photos: [], interests: [],
  })
}

async function applyReferralCode(code: string, newUserId: string): Promise<{ error?: string }> {
  const admin = createAdminClient()
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
    const origin = process.env.NEXT_PUBLIC_SITE_URL; if (!origin) return NextResponse.json({ error: 'Erreur de configuration serveur' }, { status: 500 })

    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    })

    if (authError || !authData.user) {
      logger.error('GoTrue signup failed', { error: authError?.message })
      return NextResponse.json({ error: authError?.message ?? "Erreur lors de l'inscription" }, { status: 400 })
    }

    const { error: profileError } = await createProfile(authData.user.id, name, age)
    if (profileError) {
      logger.error('Profile creation failed', { userId: authData.user.id, error: profileError.message })
      return NextResponse.json({ error: 'Erreur lors de la création du profil' }, { status: 400 })
    }

    if (referralCode) {
      const refResult = await applyReferralCode(referralCode.toUpperCase(), authData.user.id)
      if (refResult.error) {
        logger.warn('Referral code application failed', { userId: authData.user.id, code: referralCode, error: refResult.error })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('Register route error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
