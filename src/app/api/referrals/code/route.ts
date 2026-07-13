import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data, error } = await supabase.rpc('generate_referral_code', { p_user_id: user.id })

    if (error) {
      logger.error('Generate referral code RPC error', { error: String(error) })
      return NextResponse.json({ error: 'Erreur lors de la génération' }, { status: 500 })
    }

    const result = data as { code?: string; error?: string }
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json({ code: result.code })
  } catch (err) {
    logger.error('Referral code API error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
