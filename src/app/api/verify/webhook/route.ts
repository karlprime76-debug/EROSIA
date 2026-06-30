import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyWebhookSignature } from '@/lib/didit'
import { logger } from '@/lib/logger'
import type { DiditWebhookPayload } from '@/lib/didit'

const dedupCache = new Set<string>()

async function isProcessed(eventId: string): Promise<boolean> {
  if (dedupCache.has(eventId)) return true
  try {
    const admin = createAdminClient()
    const { data } = await admin.from('webhook_events').select('id').eq('event_id', eventId).maybeSingle()
    if (data) { dedupCache.add(eventId); return true }
  } catch {
    // table may not exist yet; fall back to in-memory
  }
  return false
}

async function markProcessed(eventId: string) {
  dedupCache.add(eventId)
  try {
    const admin = createAdminClient()
    await admin.from('webhook_events').insert({ event_id: eventId, source: 'didit' })
  } catch {
    // table may not exist yet; in-memory cache is the fallback
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-signature-v2') ?? ''
    const timestamp = request.headers.get('x-timestamp') ?? ''

    const isValid = await verifyWebhookSignature(rawBody, signature, timestamp)
    if (!isValid) {
      logger.warn('Didit webhook signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const payload: DiditWebhookPayload = JSON.parse(rawBody)

    if (await isProcessed(payload.event_id)) {
      logger.info('Duplicate Didit webhook event (already processed)', { eventId: payload.event_id })
      return NextResponse.json({ received: true })
    }

    if (payload.webhook_type !== 'status.updated') {
      return NextResponse.json({ received: true })
    }

    const admin = createAdminClient()

    const { data: existing } = await admin
      .from('verification_requests')
      .select('id, user_id, status')
      .eq('didit_session_id', payload.session_id)
      .maybeSingle()

    if (!existing) {
      logger.warn('Didit webhook for unknown session', { sessionId: payload.session_id })
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const isApproved = payload.status === 'Approved'
    const isRejected = payload.status === 'Declined'
    const isInReview = payload.status === 'In Review'

    if (isInReview) return NextResponse.json({ received: true })

    if (isApproved || isRejected) {
      const newStatus = isApproved ? 'approved' : 'rejected'

      const { error: updateError } = await admin
        .from('verification_requests')
        .update({ status: newStatus })
        .eq('id', existing.id)

      if (updateError) {
        logger.error('Failed to update verification request', { error: updateError.message, id: existing.id })
        return NextResponse.json({ error: 'Update failed' }, { status: 500 })
      }

      if (isApproved) {
        const { error: profileError } = await admin
          .from('profiles')
          .update({ is_verified: true })
          .eq('id', existing.user_id)

        if (profileError) {
          logger.error('Failed to set is_verified', { error: profileError.message, userId: existing.user_id })
        }

        const { error: notifError } = await admin
          .from('notifications')
          .insert({
            user_id: existing.user_id,
            type: 'verification',
            title: 'Vérification approuvée',
            message: 'Votre identité a été vérifiée avec succès.',
          })

        if (notifError) {
          logger.error('Failed to create notification', { error: notifError.message })
        }
      }
    }

    await markProcessed(payload.event_id)

    return NextResponse.json({ received: true })
  } catch (err) {
    logger.error('Didit webhook error', { error: String(err) })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
