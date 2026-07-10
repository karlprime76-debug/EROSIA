import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionDecision } from '@/lib/didit'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const { userId, sessionId } = await request.json()
    if (!userId || !sessionId) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const decision = await getSessionDecision(sessionId)

    const admin = createAdminClient()

    const { data: existing } = await admin
      .from('verification_requests')
      .select('id')
      .eq('didit_session_id', sessionId)
      .maybeSingle()

    const statusMap: Record<string, string> = {
      Approved: 'approved',
      Declined: 'rejected',
      Expired: 'expired',
      'In Review': 'manual_review',
    }
    const mappedStatus = statusMap[decision.status] ?? 'unknown'

    let diditVerificationId: string | null = null
    if (decision.decision?.id_verifications?.[0]?.node_id) {
      diditVerificationId = decision.decision.id_verifications[0].node_id
    }

    if (existing) {
      await admin.rpc('process_verification_update', {
        p_request_id: existing.id,
        p_user_id: userId,
        p_status: mappedStatus,
        p_didit_verification_id: diditVerificationId,
        p_rejection_reason: null,
      })
    } else {
      const { error: insertError } = await admin.from('verification_requests').insert({
        user_id: userId,
        didit_session_id: sessionId,
        didit_verification_id: diditVerificationId,
        status: mappedStatus,
        verified_at: mappedStatus === 'approved' ? new Date().toISOString() : null,
      })

      if (insertError) {
        logger.error('Callback: insert verification_request error', { error: insertError.message })
      }

      await admin.from('profiles').update({
        verification_status: mappedStatus,
        is_verified: mappedStatus === 'approved',
        verified_at: mappedStatus === 'approved' ? new Date().toISOString() : null,
        didit_verification_id: mappedStatus === 'approved' ? diditVerificationId : null,
      }).eq('id', userId)
    }

    if (mappedStatus === 'approved') {
      await admin.from('notifications').insert({
        user_id: userId,
        type: 'verification',
        title: 'Vérification approuvée',
        message: 'Votre identité a été vérifiée avec succès.',
      })
    } else if (mappedStatus === 'rejected') {
      await admin.from('notifications').insert({
        user_id: userId,
        type: 'verification',
        title: 'Vérification refusée',
        message: 'Votre vérification d\'identité a été refusée. Veuillez réessayer.',
      })
    }

    return NextResponse.json({ received: true, status: mappedStatus })
  } catch (err) {
    logger.error('Verification callback error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
