import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const adminClient = createAdminClient()
    const { count: totalGifts } = await adminClient.from('sent_gifts').select('*', { count: 'exact', head: true }).eq('status', 'completed')
    const { count: totalUsers } = await adminClient.from('profiles').select('*', { count: 'exact', head: true })
    const { count: pendingVerifs } = await adminClient.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    const { data: payouts } = await adminClient.from('gift_transactions').select('*').eq('type', 'payout').eq('status', 'pending')

    return NextResponse.json({
      totalGifts: totalGifts ?? 0,
      totalUsers: totalUsers ?? 0,
      pendingVerifs: pendingVerifs ?? 0,
      payouts: payouts ?? [],
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    let patchBody: Record<string, unknown>
    try { patchBody = await request.json() } catch { return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 }) }
    const { txId, status } = patchBody as { txId?: string; status?: string }
    if (!txId || !['completed', 'failed'].includes(status ?? '')) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin.from('gift_transactions').update({ status }).eq('id', txId)
    return NextResponse.json({ error: error?.message ?? null })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
