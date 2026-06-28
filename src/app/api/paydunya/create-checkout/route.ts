import { NextResponse } from 'next/server'
import { createInvoice } from '@/lib/paydunya'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.headers.get('origin') ?? 'https://erosia-jet.vercel.app'
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

    if (result.status !== 'success' || !result.token) {
      logger.error('create-checkout: PayDunya non-success', { status: result.status, response_text: result.response_text })
      return NextResponse.json({ error: result.response_text ?? 'Échec de la création du paiement', code: 'PAYDUNYA_FAILED' }, { status: 500 })
    }

    const paymentUrl = `https://payment.paydunya.com/payment/${result.token}`

    return NextResponse.json({ url: paymentUrl })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
