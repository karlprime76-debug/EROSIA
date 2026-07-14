import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import crypto from 'crypto'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('paydunya-signature')
    if (!signature) return apiError('Signature manquante', 403)

    const masterKey = process.env.PAYDUNYA_MASTER_KEY
    if (!masterKey) {
      logger.error('PAYDUNYA_MASTER_KEY not configured')
      return apiError('Configuration serveur manquante', 500)
    }

    const expectedSig = crypto
      .createHmac('sha512', masterKey)
      .update(rawBody)
      .digest('hex')

    if (signature !== expectedSig) return apiError('Signature invalide', 403)

    const body = JSON.parse(rawBody)
    const token = body?.data?.invoice?.invoice_token
    if (!token) return apiError('Token de facture manquant', 400)

    const supabase = createAdminClient()

    const { data: existing } = await supabase
      .from('gift_transactions')
      .select('id, status')
      .eq('payment_details->>invoice_token', token)
      .maybeSingle()

    if (!existing) return apiError('Transaction introuvable', 404)
    if (existing.status === 'completed') return apiResponse({ success: true })

    const { error } = await supabase
      .from('gift_transactions')
      .update({ status: 'completed' })
      .eq('id', existing.id)

    if (error) {
      logger.error('Payout-callback update error', { error: error.message, txId: existing.id })
      return apiError(error.message, 500)
    }
    return apiResponse({ success: true })
  } catch (err) {
    return apiServerError(err)
  }
}
