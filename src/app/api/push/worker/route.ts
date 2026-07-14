import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import webpush from 'web-push'
import { logger } from '@/lib/logger'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

const vapidSubject = process.env.VAPID_SUBJECT?.trim()
const subject = vapidSubject && !vapidSubject.startsWith('mailto:')
  ? `mailto:${vapidSubject}`
  : (vapidSubject ?? 'mailto:contact@erosia.app')

if (!process.env.NEXT_PUBLIC_VAPID_KEY || !process.env.VAPID_PRIVATE_KEY) {
  logger.warn('VAPID keys not configured — push notifications disabled')
} else {
  webpush.setVapidDetails(subject, process.env.NEXT_PUBLIC_VAPID_KEY, process.env.VAPID_PRIVATE_KEY)
}

export const maxDuration = 120
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const apiKey = request.headers.get('x-api-key')
    const expectedKey = process.env.PUSH_API_KEY
    if (!apiKey || !expectedKey || apiKey.length !== expectedKey.length ||
        !crypto.timingSafeEqual(Buffer.from(apiKey), Buffer.from(expectedKey))) {
      return apiError('Non autorisé', 401)
    }

    const admin = createAdminClient()

    const { data: notifications } = await admin
      .from('notifications')
      .select('id, user_id, type, title, message, action_url, metadata, created_at')
      .is('push_sent_at', null)
      .gte('created_at', new Date(Date.now() - 86400000).toISOString())
      .order('created_at', { ascending: true })
      .limit(50)

    if (!notifications || notifications.length === 0) {
      return apiResponse({ processed: 0 })
    }

    let processed = 0

    for (const notif of notifications) {
      try {
        const { data: profile } = await admin
          .from('profiles')
          .select('notif_push')
          .eq('id', notif.user_id)
          .maybeSingle()

        if (profile && !profile.notif_push) {
          await admin.from('notifications').update({ push_sent_at: new Date().toISOString() }).eq('id', notif.id)
          continue
        }

        const { data: prefs } = await admin
          .from('notification_preferences')
          .select('push_enabled, quiet_hours_start, quiet_hours_end, new_match, new_message, new_like, super_like, story_reply, date_proposal, date_reminder, gift_received, event_invite, level_up, achievement')
          .eq('user_id', notif.user_id)
          .maybeSingle()

        if (prefs) {
          if (!prefs.push_enabled) {
            await admin.from('notifications').update({ push_sent_at: new Date().toISOString() }).eq('id', notif.id)
            continue
          }

          const typeKey = ({
            match: 'new_match',
            message: 'new_message',
            like: 'new_like',
            super_like: 'super_like',
            story_reply: 'story_reply',
            date_proposal: 'date_proposal',
            date_reminder: 'date_reminder',
            gift: 'gift_received',
            event_invite: 'event_invite',
            level_up: 'level_up',
            achievement: 'achievement',
          } as Record<string, keyof typeof prefs>)[notif.type]

          if (typeKey && !prefs[typeKey]) {
            await admin.from('notifications').update({ push_sent_at: new Date().toISOString() }).eq('id', notif.id)
            continue
          }

          if (prefs.quiet_hours_start && prefs.quiet_hours_end) {
            const now = new Date()
            const hhmm = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`
            if (prefs.quiet_hours_start < prefs.quiet_hours_end) {
              if (hhmm >= prefs.quiet_hours_start && hhmm <= prefs.quiet_hours_end) {
                await admin.from('notifications').update({ push_sent_at: new Date().toISOString() }).eq('id', notif.id)
                continue
              }
            } else {
              if (hhmm >= prefs.quiet_hours_start || hhmm <= prefs.quiet_hours_end) {
                await admin.from('notifications').update({ push_sent_at: new Date().toISOString() }).eq('id', notif.id)
                continue
              }
            }
          }
        }

        const { data: subs } = await admin
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth')
          .eq('user_id', notif.user_id)

        if (!subs || subs.length === 0) {
          await admin.from('notifications').update({ push_sent_at: new Date().toISOString() }).eq('id', notif.id)
          continue
        }

        const payload = JSON.stringify({
          title: notif.title ?? 'Erosia',
          body: notif.message ?? 'Vous avez une nouvelle notification',
          url: notif.action_url ?? '/discover',
        })

        await Promise.allSettled(subs.map(async (sub) => {
          try {
            await webpush.sendNotification({
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            }, payload)
          } catch {
            await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
        }))

        await admin.from('notifications').update({ push_sent_at: new Date().toISOString() }).eq('id', notif.id)
        processed++
      } catch (err) {
        logger.error('Push worker: notification failed', { id: notif.id, error: String(err) })
      }
    }

    return apiResponse({ processed })
  } catch (err) {
    logger.error('Push worker error', { error: String(err) })
    return apiServerError(err)
  }
}
