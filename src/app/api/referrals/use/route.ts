import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { applyReferralCode } from '@/lib/referrals-server'
import { logger } from '@/lib/logger'
import { referralUseSchema } from '@/lib/validations'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    let body: Record<string, unknown>
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 }) }
    const parsed = referralUseSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Code requis' }, { status: 400 })
    const { code } = parsed.data

    const result = await applyReferralCode(code.toUpperCase())
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Referral use error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
