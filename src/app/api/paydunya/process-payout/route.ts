import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWithdrawMode, extractPhoneAlias, createDisburseInvoice, submitDisburseInvoice } from '@/lib/paydunya-disburse'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    let body: Record<string, unknown>
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 }) }
    const { amountCents } = body as { amountCents?: number }
    if (!amountCents || amountCents <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })

    const admin = createAdminClient()

    const { data: account } = await admin
      .from('payment_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!account || !account.phone) {
      return NextResponse.json({ error: 'Aucun moyen de paiement enregistré' }, { status: 400 })
    }

    const { data: received } = await admin
      .from('sent_gifts')
      .select('amount_paid, fee_cents')
      .eq('receiver_id', user.id)
      .eq('status', 'completed')

    const totalReceived = (received ?? []).reduce((sum, g) =>
      sum + (g.amount_paid ?? 0) - (g.fee_cents ?? 0), 0)

    const { data: payouts } = await admin
      .from('gift_transactions')
      .select('amount_cents')
      .eq('user_id', user.id)
      .eq('type', 'payout')
      .neq('status', 'failed')

    const totalPayouts = (payouts ?? []).reduce((sum, t) => sum + t.amount_cents, 0)
    const balance = totalReceived - totalPayouts

    if (amountCents > balance) {
      return NextResponse.json({ error: 'Solde insuffisant' }, { status: 400 })
    }

    const withdrawMode = getWithdrawMode(account.country ?? '', account.operator ?? '')
    if (!withdrawMode) {
      return NextResponse.json({ error: 'Opérateur non supporté pour les paiements sortants' }, { status: 400 })
    }

    const accountAlias = extractPhoneAlias(account.phone)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://erosia-jet.vercel.app'
    const callbackUrl = `${siteUrl}/api/paydunya/payout-callback`

    let invoice: { response_code?: string; response_text?: string; token?: string; status?: string }
    try {
      invoice = await createDisburseInvoice(accountAlias, amountCents, withdrawMode, callbackUrl)
    } catch (err) {
      logger.error('createDisburseInvoice error', { error: String(err) })
      return NextResponse.json({ error: 'Erreur de communication avec PayDunya' }, { status: 502 })
    }

    if (!invoice.token) {
      await admin.from('gift_transactions').insert({
        user_id: user.id,
        type: 'payout',
        amount_cents: amountCents,
        payment_details: JSON.stringify({ type: account.type, identifier: `${account.operator} — ${account.phone}`, error: invoice.response_text }),
        status: 'failed',
      })
      return NextResponse.json({ error: invoice.response_text ?? 'Erreur de création du paiement' }, { status: 500 })
    }

    const identifier = account.type === 'card'
      ? `${account.card_brand} ···· ${account.card_last4}`
      : `${account.operator} — ${account.phone}`

    const { data: tx } = await admin.from('gift_transactions').insert({
      user_id: user.id,
      type: 'payout',
      amount_cents: amountCents,
      payment_details: JSON.stringify({ type: account.type, identifier, paydunya_token: invoice.token, withdraw_mode: withdrawMode }),
      status: 'pending',
    }).select().single()

    let submit: { response_code?: string; response_text?: string; status?: string }
    try {
      submit = await submitDisburseInvoice(invoice.token)
    } catch (err) {
      logger.error('submitDisburseInvoice error', { error: String(err) })
      await admin.from('gift_transactions').update({ status: 'failed' }).eq('id', tx?.id)
      return NextResponse.json({ error: 'Erreur de soumission du retrait' }, { status: 502 })
    }

    if (submit.status === 'success' || submit.response_code === '00') {
      await admin.from('gift_transactions').update({ status: 'completed' }).eq('id', tx?.id)
      return NextResponse.json({ success: true, message: `Paiement de ${amountCents} F envoyé vers ${identifier}` })
    }

    await admin.from('gift_transactions').update({ status: 'failed' }).eq('id', tx?.id)
    return NextResponse.json({ error: submit.response_text ?? 'Échec du paiement' }, { status: 500 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
