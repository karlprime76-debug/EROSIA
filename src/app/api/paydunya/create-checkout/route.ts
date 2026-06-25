import { NextResponse } from 'next/server'
import { createInvoice } from '@/lib/paydunya'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const origin = request.headers.get('origin') ?? 'http://localhost:3000'
  const result = await createInvoice(
    '5000',
    'Abonnement Premium Erosia - 1 mois',
    { user_id: user.id },
    `${origin}/settings`,
    `${origin}/settings?premium=success`,
  )

  if (result.status !== 'completed' || !result.response_text) {
    return NextResponse.json({ error: result.response_text ?? 'PayDunya error' }, { status: 500 })
  }

  return NextResponse.json({ url: result.response_text })
}
