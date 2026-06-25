import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { confirmInvoice } from '@/lib/paydunya'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const dataRaw = formData.get('data') as string | null
  if (!dataRaw) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

  let data: { invoice?: { invoice_token?: string }; hash?: string }
  try { data = JSON.parse(dataRaw) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const invoiceToken = data.invoice?.invoice_token
  if (!invoiceToken) return NextResponse.json({ error: 'Missing invoice_token' }, { status: 400 })

  const expectedHash = crypto.createHash('sha512').update(process.env.PAYDUNYA_MASTER_KEY! + invoiceToken).digest('hex')
  if (data.hash !== expectedHash) return NextResponse.json({ error: 'Invalid hash' }, { status: 401 })

  const confirmed = await confirmInvoice(invoiceToken)
  if (confirmed.status !== 'completed' || confirmed.invoice?.status !== 'completed') {
    return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
  }

  const admin = createAdminClient()
  const customData = data.invoice as Record<string, string> | undefined
  const userId = customData?.user_id

  if (userId) {
    await admin.from('profiles').update({
      subscription_tier: 'premium',
      paydunya_invoice_token: invoiceToken,
      premium_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq('id', userId)
  }

  return NextResponse.json({ received: true })
}
