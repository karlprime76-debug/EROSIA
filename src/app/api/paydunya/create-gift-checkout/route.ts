import { NextResponse } from 'next/server'
import { createInvoice, sendMobileMoneyPayment } from '@/lib/paydunya'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { createGiftCheckoutSchema } from '@/lib/validations'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }

    const parsed = createGiftCheckoutSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { giftId, receiverId, matchId, message, phone, operator } = parsed.data

    const { data: match } = await supabase.from('matches')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('id', matchId)
      .maybeSingle()
    if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })
    const otherId = match.user1_id === user.id ? match.user2_id : match.user1_id
    if (receiverId !== otherId) return NextResponse.json({ error: 'Destinataire invalide' }, { status: 400 })

    const { data: gift } = await supabase.from('gifts').select('*').eq('id', giftId).maybeSingle()
    if (!gift) return NextResponse.json({ error: 'Cadeau introuvable' }, { status: 404 })
    if (typeof gift.price_cents !== 'number') {
      logger.error('create-gift-checkout: price_cents invalide', { gift_id: giftId, price_cents: gift.price_cents })
      return NextResponse.json({ error: 'Prix du cadeau invalide', code: 'INVALID_PRICE' }, { status: 500 })
    }

    const EUR_TO_XOF = 655.957
    const feePercent = 15
    const totalCents = Math.round(gift.price_cents * (1 + feePercent / 100))
    const amountFCFA = Math.round(totalCents * EUR_TO_XOF / 100)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL; if (!siteUrl) return NextResponse.json({ error: 'Erreur de configuration serveur' }, { status: 500 })

    let result: { status: string; response_text?: string; token?: string }
    try {
      result = await createInvoice(
        amountFCFA.toString(),
        `Cadeau Erosia : ${gift.name}`,
        { user_id: user.id, gift_id: giftId, receiver_id: receiverId, match_id: matchId, message: message ?? '' },
        `${siteUrl}/gifts`,
        `${siteUrl}/gifts?success=1`,
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
      logger.error('create-gift-checkout: PayDunya non-success', { status: result.status, response_text: result.response_text })
      return NextResponse.json({ error: 'Erreur de création du paiement. Contacte le support si le problème persiste.', code: 'PAYDUNYA_FAILED' }, { status: 500 })
    }

    const paydunyaHost = (process.env.PAYDUNYA_MODE ?? 'test') === 'live' ? 'payment.paydunya.com' : 'payment.paydunya-sandbox.com'
    const paymentUrl = `https://${paydunyaHost}/payment/${result.token}`

    // Mobile Money direct push — fallback to checkout URL if OPR fails
    if (phone && operator) {
      try {
        const pushResult = await sendMobileMoneyPayment(result.token, phone, operator, user.email ?? user.id)
        if (pushResult.status === 'success') return NextResponse.json({ sent: true })
        logger.warn('PayDunya OPR failed, falling back to checkout URL', { response: pushResult.response_text })
      } catch (err) {
        logger.warn('PayDunya OPR error, falling back to checkout URL', { error: String(err) })
      }
    }

    return NextResponse.json({ url: paymentUrl })
  } catch (err) {
    logger.error('create-gift-checkout: erreur inattendue', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur', code: 'UNEXPECTED' }, { status: 500 })
  }
}
