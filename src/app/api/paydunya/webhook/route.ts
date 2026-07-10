// UNGUARDED ENV: process.env.PAYDUNYA_MASTER_KEY! (l.43) — si vide, le hash échoue silencieusement
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { confirmInvoice } from '@/lib/paydunya'
import { logger } from '@/lib/logger'

async function claimWebhookEvent(eventId: string): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const { data } = await admin.rpc('try_claim_webhook_event', { p_event_id: eventId, p_source: 'paydunya' })
    return data === true
  } catch {
    return false
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

    const masterKey = process.env.PAYDUNYA_MASTER_KEY
    if (!masterKey) {
      logger.error('PAYDUNYA_MASTER_KEY is not configured')
      return NextResponse.json({ error: 'Erreur de configuration serveur' }, { status: 500 })
    }
    const expectedHash = crypto.createHash('sha512').update(masterKey + invoiceToken).digest('hex')
    if (data.hash !== expectedHash) return NextResponse.json({ error: 'Invalid hash' }, { status: 403 })

    if (!(await claimWebhookEvent(invoiceToken))) {
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

    if (userId && !giftId && !customData.cart_gift_ids) {
      const plan = customData.plan
      const days = plan === 'yearly' ? 365 : 30
      const { data: profile } = await admin.from('profiles')
        .select('premium_expires_at')
        .eq('id', userId)
        .maybeSingle()
      const now = new Date()
      const currentExpiry = profile?.premium_expires_at ? new Date(profile.premium_expires_at) : now
      const baseExpiry = currentExpiry > now ? currentExpiry : now
      const newExpiry = new Date(baseExpiry.getTime() + days * 24 * 60 * 60 * 1000)
      await admin.from('profiles').update({
        subscription_tier: 'premium',
        premium_expires_at: newExpiry.toISOString(),
      }).eq('id', userId)
    }

    const giftIds: string[] = giftId ? [giftId] : customData.cart_gift_ids ? JSON.parse(customData.cart_gift_ids) : []

    if (userId && giftIds.length > 0 && receiverId && matchId) {
      const { data: gifts } = await admin.from('gifts').select('*').in('id', giftIds)
      if (gifts) {
        for (const gift of gifts) {
          const { data: sentGift } = await admin.from('sent_gifts').insert({
            sender_id: userId,
            receiver_id: receiverId,
            gift_id: gift.id,
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
        }

        try {
          await admin.from('notifications').insert({
            user_id: receiverId,
            actor_id: userId,
            type: 'gift',
            title: 'Cadeaux reçus !',
            message: `Tu as reçu ${gifts.length} cadeau(x) !`,
          })
        } catch (e) {
          logger.error('Notification insert failed (non-blocking)', { error: String(e) })
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    logger.error('PayDunya webhook error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
