import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyWebhookSignature, getSessionDecision } from '@/lib/didit'
import { logger } from '@/lib/logger'
import type { DiditWebhookPayload } from '@/lib/didit'

function getRejectionReason(payload: DiditWebhookPayload): string | null {
  const reasons: string[] = []
  if (payload.decision?.id_verifications) {
    for (const v of payload.decision.id_verifications) {
      if (v.status === 'declined') reasons.push('Pièce d\'identité non valide')
    }
  }
  if (payload.decision?.liveness_checks) {
    for (const l of payload.decision.liveness_checks) {
      if (l.status === 'declined' || l.score < 0.5) reasons.push('Selfie non valide')
    }
  }
  if (payload.decision?.face_matches) {
    for (const f of payload.decision.face_matches) {
      if (f.status === 'declined' || f.score < 0.5) reasons.push('Le selfie ne correspond pas à la pièce d\'identité')
    }
  }
  return reasons.length > 0 ? reasons.join(', ') : null
}

function mapDiditStatus(diditStatus: string): string {
  switch (diditStatus) {
    case 'Approved': return 'approved'
    case 'Declined': return 'rejected'
    case 'Expired': return 'expired'
    case 'In Review': return 'manual_review'
    default: return 'unknown'
  }
}

function getNotificationTitle(status: string): string {
  switch (status) {
    case 'approved': return 'Vérification approuvée'
    case 'rejected': return 'Vérification refusée'
    case 'expired': return 'Vérification expirée'
    case 'manual_review': return 'Vérification en cours d\'examen'
    default: return 'Mise à jour de la vérification'
  }
}

function getNotificationMessage(status: string, rejectionReason?: string | null): string {
  switch (status) {
    case 'approved': return 'Votre identité a été vérifiée avec succès.'
    case 'rejected': return rejectionReason
      ? `Votre vérification a été refusée : ${rejectionReason}`
      : 'Votre vérification d\'identité a été refusée. Veuillez réessayer.'
    case 'expired': return 'Votre session de vérification a expiré. Veuillez relancer une vérification.'
    case 'manual_review': return 'Votre dossier est en cours d\'examen par notre équipe. Vous recevrez une réponse sous 24 à 48 heures.'
    default: return 'Le statut de votre vérification a été mis à jour.'
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-signature-v2') ?? ''
    const timestamp = request.headers.get('x-timestamp') ?? ''

    const isValid = await verifyWebhookSignature(rawBody, signature, timestamp)
    if (!isValid) {
      logger.warn('Didit webhook signature verification failed', {
        hasSignature: !!signature,
        signatureLength: signature.length,
        hasTimestamp: !!timestamp,
        hasSecret: !!process.env.DIDIT_WEBHOOK_SECRET,
        secretLength: process.env.DIDIT_WEBHOOK_SECRET?.length ?? 0,
      })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const payload: DiditWebhookPayload = JSON.parse(rawBody)

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

    const mappedStatus = mapDiditStatus(payload.status)

    let diditVerificationId = payload.session_id

    try {
      const decision = await getSessionDecision(payload.session_id)
      if (decision.decision?.id_verifications?.[0]?.node_id) {
        diditVerificationId = decision.decision.id_verifications[0].node_id
      }
    } catch {
      logger.warn('Could not fetch decision details, using session_id as verification_id')
    }

    const rejectionReason = mappedStatus === 'rejected' ? getRejectionReason(payload) : null

    const { error: rpcError } = await admin.rpc('process_verification_update', {
      p_request_id: existing.id,
      p_user_id: existing.user_id,
      p_status: mappedStatus,
      p_didit_verification_id: diditVerificationId,
      p_rejection_reason: rejectionReason,
    })

    if (rpcError) {
      logger.error('Failed to process verification update via RPC', { error: rpcError.message, id: existing.id })

      const { error: updateError } = await admin
        .from('verification_requests')
        .update({
          status: mappedStatus,
          didit_verification_id: diditVerificationId,
          verified_at: mappedStatus === 'approved' ? new Date().toISOString() : null,
          rejection_reason: rejectionReason,
        })
        .eq('id', existing.id)

      if (updateError) {
        logger.error('Fallback update also failed', { error: updateError.message })
        return NextResponse.json({ error: 'Update failed' }, { status: 500 })
      }

      const profileUpdate: Record<string, unknown> = {
        verification_status: mappedStatus,
        is_verified: mappedStatus === 'approved',
        verified_at: mappedStatus === 'approved' ? new Date().toISOString() : null,
        didit_verification_id: mappedStatus === 'approved' ? diditVerificationId : null,
      }
      await admin.from('profiles').update(profileUpdate).eq('id', existing.user_id)
    }

    await admin.from('notifications').insert({
      user_id: existing.user_id,
      type: 'verification',
      title: getNotificationTitle(mappedStatus),
      message: getNotificationMessage(mappedStatus, rejectionReason),
    })

    return NextResponse.json({ received: true })
  } catch (err) {
    logger.error('Didit webhook error', { error: String(err) })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
