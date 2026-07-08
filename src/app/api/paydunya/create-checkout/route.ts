import { NextResponse } from 'next/server'
import { createInvoice } from '@/lib/paydunya'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function POST(_request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL; if (!siteUrl) throw new Error('NEXT_PUBLIC_SITE_URL not configured')
    let result: { status: string; response_text?: string; token?: string }
    try {
      result = await createInvoice(
        '5000',
        'Abonnement Premium Erosia - 1 mois',
        { user_id: user.id },
        `${siteUrl}/settings`,
        `${siteUrl}/settings?premium=success`,
        `${siteUrl}/api/paydunya/webhook`,
      )
    } catch (err) {
      logger.error('PayDunya createInvoice error', { error: String(err) })
      return NextResponse.json({ error: 'Erreur de communication avec PayDunya' }, { status: 502 })
    }

    // PayDunya renvoie parfois l'URL dans response_text au lieu du champ token
    if ((result.status !== 'success' || !result.token) && result.response_text?.startsWith('https://payment.')) {
      return NextResponse.json({ url: result.response_text })
    }
    if (result.status !== 'success' || !result.token) {
      logger.error('create-checkout: PayDunya non-success', { status: result.status, response_text: result.response_text })
      return NextResponse.json({ error: 'Échec de la création du paiement. Contacte le support si le problème persiste.', code: 'PAYDUNYA_FAILED' }, { status: 500 })
    }

    const paydunyaHost = process.env.PAYDUNYA_MODE === 'live' ? 'payment.paydunya.com' : 'payment.paydunya-sandbox.com'
    const paymentUrl = `https://${paydunyaHost}/payment/${result.token}`

    return NextResponse.json({ url: paymentUrl })
  } catch (err) {
    logger.error('Create checkout error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
