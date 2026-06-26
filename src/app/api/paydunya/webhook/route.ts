import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { confirmInvoice } from '@/lib/paydunya'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const dataRaw = formData.get('data') as string | null
  if (!dataRaw) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

  let data: { invoice?: { invoice_token?: string }; hash?: string }
  try { data = JSON.parse(dataRaw) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const invoiceToken = data.invoice?.invoice_token
  if (!invoiceToken) return NextResponse.json({ error: 'Missing invoice_token' }, { status: 400 })

  const expectedHash = crypto.createHash('sha512').update(process.env.PAYDUNYA_MASTER_KEY! + invoiceToken).digest('hex')
  if (data.hash !== expectedHash) return NextResponse.json({ error: 'Invalid hash' }, { status: 401 })

  let confirmed: { status: string; invoice?: { status: string; custom_data?: Record<string, string> }; customer?: Record<string, string> }
  try {
    confirmed = await confirmInvoice(invoiceToken)
  } catch (err) {
    console.error('confirmInvoice error:', err)
    return NextResponse.json({ error: 'Erreur de confirmation PayDunya' }, { status: 502 })
  }
  if (confirmed.status !== 'completed' && confirmed.status !== 'success') {
    return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
  }
  const invoiceStatus = confirmed.invoice?.status
  if (invoiceStatus !== 'completed' && invoiceStatus !== 'success') {
    return NextResponse.json({ error: 'Invoice not completed' }, { status: 400 })
  }

  const admin = createAdminClient()
  const customData = confirmed.invoice?.custom_data ?? {}
  const userId = customData.user_id
  const giftId = customData.gift_id
  const receiverId = customData.receiver_id
  const matchId = customData.match_id
  const message = customData.message ?? null

  if (userId && !giftId) {
    await admin.from('profiles').update({
      subscription_tier: 'premium',
      paydunya_invoice_token: invoiceToken,
      premium_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq('id', userId)
  }

  if (userId && giftId && receiverId && matchId) {
    const { data: gift } = await admin.from('gifts').select('*').eq('id', giftId).single()
    if (gift) {
      const { data: sentGift } = await admin.from('sent_gifts').insert({
        sender_id: userId,
        receiver_id: receiverId,
        gift_id: giftId,
        match_id: matchId,
        message: message,
        amount_paid: gift.price_cents,
        fee_cents: Math.round(gift.price_cents * 0.15),
        status: 'completed',
      }).select().single()

      if (sentGift) {
        const fee = Math.round(gift.price_cents * 0.15)
        const netAmount = gift.price_cents - fee
        await admin.from('gift_transactions').insert({
          user_id: receiverId,
          type: 'gift_received',
          amount_cents: netAmount,
          sent_gift_id: sentGift.id,
          status: 'completed',
        })
      }

      try {
        await admin.from('notifications').insert({
          user_id: receiverId,
          actor_id: userId,
          type: 'gift',
          content: `Tu as reçu un cadeau !`,
        })
      } catch (e) {
        console.error('Notification insert failed (non-blocking):', e)
      }
    }
  }

  return NextResponse.json({ received: true })
}
