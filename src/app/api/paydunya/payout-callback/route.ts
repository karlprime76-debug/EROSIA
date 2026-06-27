import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('paydunya-signature')
    if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 401 })

    const expectedSig = crypto
      .createHmac('sha512', process.env.PAYDUNYA_MASTER_KEY ?? '')
      .update(rawBody)
      .digest('hex')

    if (signature !== expectedSig) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

    const body = JSON.parse(rawBody)
    const token = body?.data?.invoice?.invoice_token
    if (!token) return NextResponse.json({ error: 'Missing invoice token' }, { status: 400 })

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('gift_transactions')
      .update({ status: 'completed' })
      .eq('payment_details->>invoice_token', token)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
