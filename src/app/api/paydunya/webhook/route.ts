import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { confirmInvoice } from '@/lib/paydunya'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const dataRaw = formData.get('data') as string | null
  if (!dataRaw) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

  let data: { invoice?: { invoice_token?: string; custom_data?: Record<string, string> }; hash?: string }
  try { data = JSON.parse(dataRaw) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const invoiceToken = data.invoice?.invoice_token
  if (!invoiceToken) return NextResponse.json({ error: 'Missing invoice_token' }, { status: 400 })

  const expectedHash = crypto.createHash('sha512').update(process.env.PAYDUNYA_MASTER_KEY! + invoiceToken).digest('hex')
  if (data.hash !== expectedHash) return NextResponse.json({ error: 'Invalid hash' }, { status: 401 })

  const confirmed = await confirmInvoice(invoiceToken)
  if (confirmed.status !== 'completed' || confirmed.invoice?.status !== 'completed') {
    return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
  }

  const admin = createAdminClient()
  const customData = data.invoice?.custom_data ?? {}
  const userId = customData.user_id
  const giftId = customData.gift_id
  const receiverId = customData.receiver_id
  const matchId = customData.match_id
  const message = customData.message ?? null

  if (userId && !giftId) {
    // Premium subscription
    await admin.from('profiles').update({
      subscription_tier: 'premium',
      paydunya_invoice_token: invoiceToken,
      premium_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq('id', userId)
  }

  if (userId && giftId && receiverId && matchId) {
    // Gift purchase
    const { data: gift } = await admin.from('gifts').select('*').eq('id', giftId).single()
    if (gift) {
      await admin.from('sent_gifts').insert({
        sender_id: userId,
        receiver_id: receiverId,
        gift_id: giftId,
        match_id: matchId,
        message: message,
        amount_paid: gift.price_cents,
        fee_cents: Math.round(gift.price_cents * 0.15),
        status: 'completed',
      })
      await admin.from('notifications').insert({
        user_id: receiverId,
        actor_id: userId,
        type: 'gift',
        content: `Tu as reçu un cadeau !`,
      })
    }
  }

  return NextResponse.json({ received: true })
}
