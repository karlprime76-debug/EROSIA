import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWithdrawMode, extractPhoneAlias, createDisburseInvoice, submitDisburseInvoice } from '@/lib/paydunya-disburse'
import { processPayoutSchema } from '@/lib/validations'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    let body: Record<string, unknown>
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 }) }
    const parsed = processPayoutSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
    const { amountCents } = parsed.data

    const admin = createAdminClient()

    const { data: account } = await admin
      .from('payment_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!account || !account.phone) {
      return NextResponse.json({ error: 'Aucun moyen de paiement enregistré' }, { status: 404 })
    }

    const withdrawMode = getWithdrawMode(account.country ?? '', account.operator ?? '')
    if (!withdrawMode) {
      return NextResponse.json({ error: 'Opérateur non supporté pour les paiements sortants' }, { status: 400 })
    }

    const accountAlias = extractPhoneAlias(account.phone)

    const identifier = account.type === 'card'
      ? `${account.card_brand} ···· ${account.card_last4}`
      : `${account.operator} — ${account.phone}`

    const paymentDetails = JSON.stringify({ type: account.type, identifier, withdraw_mode: withdrawMode })

    const { data: payoutResult, error: payoutError } = await admin.rpc('process_payout', {
      p_user_id: user.id,
      p_amount_cents: amountCents,
      p_payment_details: paymentDetails,
    })

    if (payoutError || payoutResult?.error) {
      if (payoutResult?.error === 'Solde insuffisant') {
        return NextResponse.json({ error: 'Solde insuffisant' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Erreur lors du traitement du retrait' }, { status: 500 })
    }

    const txId = payoutResult.tx_id
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://erosia.app'
    const callbackUrl = `${siteUrl}/api/paydunya/payout-callback`

    let invoice: { response_code?: string; response_text?: string; token?: string; status?: string }
    try {
      invoice = await createDisburseInvoice(accountAlias, amountCents, withdrawMode, callbackUrl)
    } catch (err) {
      logger.error('createDisburseInvoice error', { error: String(err) })
      await admin.from('gift_transactions').update({ status: 'failed' }).eq('id', txId)
      return NextResponse.json({ error: 'Erreur de communication avec PayDunya' }, { status: 502 })
    }

    if (!invoice.token) {
      await admin.from('gift_transactions').update({
        status: 'failed',
        payment_details: JSON.stringify({ type: account.type, identifier, error: invoice.response_text }),
      }).eq('id', txId)
      return NextResponse.json({ error: 'Erreur de création du paiement. Contacte le support.' }, { status: 500 })
    }

    await admin.from('gift_transactions').update({
      payment_details: JSON.stringify({ type: account.type, identifier, invoice_token: invoice.token, withdraw_mode: withdrawMode }),
    }).eq('id', txId)

    let submit: { response_code?: string; response_text?: string; status?: string }
    try {
      submit = await submitDisburseInvoice(invoice.token)
    } catch (err) {
      logger.error('submitDisburseInvoice error', { error: String(err) })
      await admin.from('gift_transactions').update({ status: 'failed' }).eq('id', txId)
      return NextResponse.json({ error: 'Erreur de soumission du retrait' }, { status: 502 })
    }

    if (submit.status === 'success' || submit.response_code === '00') {
      await admin.from('gift_transactions').update({ status: 'completed' }).eq('id', txId)
      return NextResponse.json({ success: true, message: `Paiement de ${amountCents} F envoyé vers ${identifier}` })
    }

    await admin.from('gift_transactions').update({ status: 'failed' }).eq('id', txId)
    return NextResponse.json({ error: 'Échec du paiement. Contacte le support.' }, { status: 500 })
  } catch (err) {
    logger.error('Payout error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
