import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redeemReferralReward } from '@/lib/referrals-server'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const result = await redeemReferralReward()
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Referral redeem error', { error: String(err) })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
