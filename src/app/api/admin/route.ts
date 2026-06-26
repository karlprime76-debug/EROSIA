import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const admin = createAdminClient()

  const { count: totalGifts } = await admin.from('sent_gifts').select('*', { count: 'exact', head: true }).eq('status', 'completed')
  const { count: totalUsers } = await admin.from('profiles').select('*', { count: 'exact', head: true })
  const { count: pendingVerifs } = await admin.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
  const { count: pendingPayouts } = await admin.from('gift_transactions').select('*', { count: 'exact', head: true }).eq('type', 'payout').eq('status', 'pending')
  const { count: totalPayoutsAll } = await admin.from('gift_transactions').select('*', { count: 'exact', head: true }).eq('type', 'payout').eq('status', 'completed')

  const { data: payouts } = await admin
    .from('gift_transactions')
    .select('id, user_id, amount_cents, payment_details, status, created_at')
    .eq('type', 'payout')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20)

  const userIds = [...new Set((payouts ?? []).map(p => p.user_id))]
  const userNames: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await admin.from('profiles').select('id, name').in('id', userIds)
    if (profiles) {
      for (const p of profiles) userNames[p.id] = p.name
    }
  }

  return NextResponse.json({
    stats: { totalGifts: totalGifts ?? 0, totalUsers: totalUsers ?? 0, pendingVerifs: pendingVerifs ?? 0, pendingPayouts: pendingPayouts ?? 0, totalPayoutsAll: totalPayoutsAll ?? 0 },
    payouts: (payouts ?? []).map(p => ({ ...p, user_name: userNames[p.user_id] ?? 'Inconnu' })),
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { txId, status } = await request.json()
  if (!txId || !['completed', 'failed'].includes(status)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('gift_transactions').update({ status }).eq('id', txId)
  return NextResponse.json({ error: error?.message ?? null })
}
