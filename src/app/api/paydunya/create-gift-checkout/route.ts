import { NextResponse } from 'next/server'
import { createInvoice } from '@/lib/paydunya'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const { giftId, receiverId, matchId, message } = body as { giftId?: string; receiverId?: string; matchId?: string; message?: string }
  if (!giftId || !receiverId || !matchId) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const { data: gift } = await supabase.from('gifts').select('*').eq('id', giftId).single()
  if (!gift) return NextResponse.json({ error: 'Cadeau introuvable' }, { status: 404 })
  if (typeof gift.price_cents !== 'number') {
    return NextResponse.json({ error: 'Prix du cadeau invalide' }, { status: 500 })
  }

  const EUR_TO_XOF = 655.957
  const feePercent = 15
  const totalCents = Math.round(gift.price_cents * (1 + feePercent / 100))
  const amountFCFA = Math.round(totalCents * EUR_TO_XOF / 100)

  const origin = request.headers.get('origin') ?? 'http://localhost:3000'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://erosia-jet.vercel.app'

  let result: { status: string; response_text?: string; token?: string }
  try {
    result = await createInvoice(
      amountFCFA.toString(),
      `Cadeau Erosia : ${gift.name}`,
      { user_id: user.id, gift_id: giftId, receiver_id: receiverId, match_id: matchId, message: message ?? '' },
      `${origin}/gifts`,
      `${origin}/gifts?success=1`,
      `${siteUrl}/api/paydunya/webhook`,
    )
  } catch (err) {
    console.error('PayDunya createInvoice error:', err)
    return NextResponse.json({ error: 'Erreur de communication avec PayDunya' }, { status: 502 })
  }

  if (result.status !== 'success' || !result.token) {
    return NextResponse.json({ error: result.response_text ?? 'Erreur de création du paiement' }, { status: 500 })
  }

  const paymentUrl = result.response_text?.startsWith('http')
    ? result.response_text
    : `https://payment.paydunya.com/payment/${result.token}`

  return NextResponse.json({ url: paymentUrl })
}
