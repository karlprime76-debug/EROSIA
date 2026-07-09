import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { logger } from '@/lib/logger'
import { pushSendSchema } from '@/lib/validations'

const vapidSubject = process.env.VAPID_SUBJECT?.trim()
const subject = vapidSubject && !vapidSubject.startsWith('mailto:')
  ? `mailto:${vapidSubject}`
  : (vapidSubject ?? 'mailto:contact@erosia.app')

if (!process.env.NEXT_PUBLIC_VAPID_KEY || !process.env.VAPID_PRIVATE_KEY) {
  logger.warn('VAPID keys not configured — push notifications disabled')
} else {
  webpush.setVapidDetails(subject, process.env.NEXT_PUBLIC_VAPID_KEY, process.env.VAPID_PRIVATE_KEY)
}

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get('x-api-key')
    const expectedKey = process.env.PUSH_API_KEY
    if (!apiKey || !expectedKey || apiKey.length !== expectedKey.length ||
        !crypto.timingSafeEqual(Buffer.from(apiKey), Buffer.from(expectedKey))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    let reqBody: Record<string, unknown>
    try { reqBody = await request.json() } catch { return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 }) }
    const parsed = pushSendSchema.safeParse(reqBody)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }
    const { userId, title, body, url } = parsed.data

    const admin = createAdminClient()
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (!subs || subs.length === 0) {
      return NextResponse.json({ sent: 0 })
    }

    const payload = JSON.stringify({ title, body, url: url ?? '/discover' })
    let sent = 0

    await Promise.all(subs.map(async (sub) => {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        }, payload)
        sent++
      } catch (err) {
        logger.error('Push notification failed, removing subscription', { endpoint: sub.endpoint, error: String(err) })
        await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }))

    return NextResponse.json({ sent })
  } catch (err) {
    logger.error('Push send error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
