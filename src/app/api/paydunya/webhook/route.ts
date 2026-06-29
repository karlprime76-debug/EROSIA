// UNGUARDED ENV: process.env.PAYDUNYA_MASTER_KEY! (l.43) — si vide, le hash échoue silencieusement
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

const dedupCache = new Set<string>()

async function isProcessed(eventId: string): Promise<boolean> {
  if (dedupCache.has(eventId)) return true
  try {
    const admin = createAdminClient()
    const { data } = await admin.from('webhook_events').select('id').eq('event_id', eventId).maybeSingle()
    if (data) { dedupCache.add(eventId); return true }
  } catch {
    // table may not exist yet; skip DB check
  }
  return false
}

async function markProcessed(eventId: string) {
  dedupCache.add(eventId)
  try {
    const admin = createAdminClient()
    await admin.from('webhook_events').insert({ event_id: eventId, source: 'paydunya' })
  } catch {
    // table may not exist yet; in-memory cache is the fallback
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const dataRaw = formData.get('data') as string | null
    if (!dataRaw) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

    let data: { invoice?: { invoice_token?: string }; hash?: string }
    try { data = JSON.parse(dataRaw) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

    const invoiceToken = data.invoice?.invoice_token
    if (!invoiceToken) return NextResponse.json({ error: 'Missing invoice_token' }, { status: 400 })

    const expectedHash = crypto.createHash('sha512').update(process.env.PAYDUNYA_MASTER_KEY! + invoiceToken).digest('hex')
    if (data.hash !== expectedHash) return NextResponse.json({ error: 'Invalid hash' }, { status: 403 })

    if (await isProcessed(invoiceToken)) {
      logger.info('Duplicate PayDunya webhook event (already processed)', { invoiceToken })
      return NextResponse.json({ received: true })
    }

    let confirmed: { status: string; invoice?: { status: string; custom_data?: Record<string, string> }; customer?: Record<string, string> }
    try {
      confirmed = await confirmInvoice(invoiceToken)
    } catch (err) {
      logger.error('confirmInvoice error', { error: String(err) })
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
        premium_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq('id', userId)
    }

    if (userId && giftId && receiverId && matchId) {
      const { data: gift } = await admin.from('gifts').select('*').eq('id', giftId).maybeSingle()
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
            title: 'Cadeau reçu !',
            message: 'Tu as reçu un cadeau !',
          })
        } catch (e) {
          logger.error('Notification insert failed (non-blocking)', { error: String(e) })
        }
      }
    }

    await markProcessed(invoiceToken)

    return NextResponse.json({ received: true })
  } catch (err) {
    logger.error('PayDunya webhook error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
