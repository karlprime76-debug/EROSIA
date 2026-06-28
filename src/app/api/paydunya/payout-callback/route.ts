import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('paydunya-signature')
    if (!signature) return NextResponse.json({ error: 'Signature manquante' }, { status: 403 })

    const masterKey = process.env.PAYDUNYA_MASTER_KEY
    if (!masterKey) {
      logger.error('PAYDUNYA_MASTER_KEY not configured')
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
    }

    const expectedSig = crypto
      .createHmac('sha512', masterKey)
      .update(rawBody)
      .digest('hex')

    if (signature !== expectedSig) return NextResponse.json({ error: 'Signature invalide' }, { status: 403 })

    const body = JSON.parse(rawBody)
    const token = body?.data?.invoice?.invoice_token
    if (!token) return NextResponse.json({ error: 'Token de facture manquant' }, { status: 400 })

    const supabase = createAdminClient()

    const { data: existing } = await supabase
      .from('gift_transactions')
      .select('id, status')
      .eq('payment_details->>invoice_token', token)
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })
    if (existing.status === 'completed') return NextResponse.json({ success: true })

    const { error } = await supabase
      .from('gift_transactions')
      .update({ status: 'completed' })
      .eq('id', existing.id)

    if (error) {
      logger.error('Payout-callback update error', { error: error.message, txId: existing.id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Payout-callback error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
