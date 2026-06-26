import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const dataRaw = formData.get('data') as string | null
  if (!dataRaw) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

  let data: { token?: string; status?: string; response_text?: string }
  try { data = JSON.parse(dataRaw) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!data.token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const admin = createAdminClient()

  const escapedToken = data.token.replace(/[%_]/g, '\\$&')
  const { data: transactions } = await admin
    .from('gift_transactions')
    .select('id, payment_details')
    .eq('type', 'payout')
    .ilike('payment_details', `%"paydunya_token":"${escapedToken}"%`)

  if (!transactions || transactions.length === 0) {
    return NextResponse.json({ received: true })
  }

  for (const tx of transactions) {
    const newStatus = data.status === 'success' ? 'completed' : 'failed'
    await admin.from('gift_transactions').update({ status: newStatus }).eq('id', tx.id)
  }

  return NextResponse.json({ received: true })
}
