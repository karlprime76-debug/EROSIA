import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redeemReferralReward } from '@/lib/referrals-server'
import { logger } from '@/lib/logger'
import { redeemCodeSchema } from '@/lib/validations'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    let body: Record<string, unknown>
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }
    const parsed = redeemCodeSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    parsed.data.code // validated but not consumed by redeemReferralReward

    const result = await redeemReferralReward()
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Referral redeem error', { error: String(err) })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
