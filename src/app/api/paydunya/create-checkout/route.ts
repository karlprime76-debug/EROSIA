import { NextResponse } from 'next/server'
import { createInvoice } from '@/lib/paydunya'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const origin = request.headers.get('origin') ?? 'http://localhost:3000'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://erosia-jet.vercel.app'
  let result: { status: string; response_text?: string; token?: string }
  try {
    result = await createInvoice(
      '5000',
      'Abonnement Premium Erosia - 1 mois',
      { user_id: user.id },
      `${origin}/settings`,
      `${origin}/settings?premium=success`,
      `${siteUrl}/api/paydunya/webhook`,
    )
  } catch (err) {
    console.error('PayDunya createInvoice error:', err)
    return NextResponse.json({ error: 'Erreur de communication avec PayDunya' }, { status: 502 })
  }

  if (result.status !== 'success' || !result.token) {
    return NextResponse.json({ error: result.response_text ?? 'Échec de la création du paiement' }, { status: 500 })
  }

  const paymentUrl = result.response_text?.startsWith('http')
    ? result.response_text
    : `https://payment.paydunya.com/payment/${result.token}`

  return NextResponse.json({ url: paymentUrl })
}
