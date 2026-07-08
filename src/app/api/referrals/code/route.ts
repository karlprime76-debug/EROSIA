import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getReferralCode } from '@/lib/referrals'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const code = await getReferralCode()
    return NextResponse.json({ code })
  } catch (err) {
    logger.error('Referral code error', { error: String(err) })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
