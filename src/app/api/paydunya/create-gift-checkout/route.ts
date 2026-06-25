import { NextResponse } from 'next/server'
import { createInvoice } from '@/lib/paydunya'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { giftId, receiverId, matchId, message } = await request.json()
  if (!giftId || !receiverId || !matchId) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const { data: gift } = await supabase.from('gifts').select('*').eq('id', giftId).single()
  if (!gift) return NextResponse.json({ error: 'Cadeau introuvable' }, { status: 404 })

  const feePercent = 15
  const totalCents = Math.round(gift.price_cents * (1 + feePercent / 100))
  const amountFCFA = Math.round(totalCents * 0.655957)

  const origin = request.headers.get('origin') ?? 'http://localhost:3000'
  const result = await createInvoice(
    amountFCFA.toString(),
    `Cadeau Erosia : ${gift.name}`,
    { user_id: user.id, gift_id: giftId, receiver_id: receiverId, match_id: matchId, message: message ?? '' },
    `${origin}/gifts`,
    `${origin}/gifts?success=1`,
  )

  if (result.status !== 'completed' || !result.response_text) {
    return NextResponse.json({ error: result.response_text ?? 'Erreur PayDunya' }, { status: 500 })
  }

  return NextResponse.json({ url: result.response_text })
}
