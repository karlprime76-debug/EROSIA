import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import webpush from 'web-push'

function ensureVapidConfigured() {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    throw new Error('VAPID keys not configured')
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:contact@erosia.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== process.env.PUSH_API_KEY) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    try { ensureVapidConfigured() } catch {
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
    }

    const { userId, title, body, url } = await request.json()
    if (!userId || !title) {
      return NextResponse.json({ error: 'userId and title required' }, { status: 400 })
    }

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
      } catch {
        await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }))

    return NextResponse.json({ sent })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
