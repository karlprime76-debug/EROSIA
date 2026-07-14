import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { registerSchema } from '@/lib/validations'
import { sanitize } from '@/lib/sanitize'
import { logger } from '@/lib/logger'
import { apiServerError } from '@/lib/api-response'

const admin = createAdminClient()

const RATE_LIMIT_WINDOW = 60_000
const RATE_LIMIT_MAX = 5
const ipMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = ipMap.get(ip)
  if (!entry || now > entry.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 }
  }
  entry.count++
  return { allowed: entry.count <= RATE_LIMIT_MAX, remaining: Math.max(0, RATE_LIMIT_MAX - entry.count) }
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
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { allowed, remaining } = checkRateLimit(ip)
    if (!allowed) {
      return NextResponse.json({ error: 'Trop de tentatives. Réessaie dans une minute.' }, {
        status: 429,
        headers: { 'X-RateLimit-Remaining': '0', 'Retry-After': '60' },
      })
    }

    const body = await request.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400, headers: { 'X-RateLimit-Remaining': String(remaining) } })
    }

    const { email, password, name, age, gender, interestedIn, referralCode } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()

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
      return NextResponse.json({ error: "Erreur lors de l'inscription" }, {
        status: 500,
        headers: { 'X-RateLimit-Remaining': String(remaining) },
      })
    }

    if (rpcResult.error) {
      return NextResponse.json({ error: rpcResult.error }, { status: 409, headers: { 'X-RateLimit-Remaining': String(remaining) } })
    }

    const userId: string = rpcResult.user_id
    if (!userId) {
      return NextResponse.json({ error: "Erreur lors de l'inscription" }, {
        status: 500,
        headers: { 'X-RateLimit-Remaining': String(remaining) },
      })
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

    return NextResponse.json({ ok: true, autoLogin: !signInError }, {
      headers: { 'X-RateLimit-Remaining': String(remaining) },
    })
  } catch (err) {
    return apiServerError(err)
  }
}
