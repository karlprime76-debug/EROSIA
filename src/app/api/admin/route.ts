import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminPatchSchema } from '@/lib/validations'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié', status: 401, userId: null }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) return { error: 'Accès refusé', status: 403, userId: null }
  return { error: null, status: 200, userId: user.id }
}

export async function GET(request: Request) {
  try {
    const check = await checkAdmin()
    if (check.error) return apiError(check.error, check.status)

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')

    const adminClient = createAdminClient()
    const { count: totalGifts } = await adminClient.from('sent_gifts').select('*', { count: 'exact', head: true }).eq('status', 'completed')
    const { count: totalUsers } = await adminClient.from('profiles').select('*', { count: 'exact', head: true })
    const { count: pendingVerifs } = await adminClient.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    const { data: payouts } = await adminClient.from('gift_transactions').select('*').eq('type', 'payout').eq('status', 'pending')

    if (format === 'csv') {
      const { data: users } = await adminClient.from('profiles')
        .select('id, name, email, age, location, is_verified, is_suspended, is_banned, subscription_tier, subscription_end, created_at')
        .order('created_at', { ascending: false })
        .limit(10000)
      const headers = 'ID,Nom,Email,Âge,Localisation,Vérifié,Suspendu,Banni,Abonnement,FinAbonnement,Inscription'
      const rows = (users ?? []).map(u =>
        `"${u.id}","${(u.name ?? '').replace(/"/g, '""')}","${(u.email ?? '').replace(/"/g, '""')}",${u.age ?? ''},"${(u.location ?? '').replace(/"/g, '""')}",${u.is_verified},${u.is_suspended},${u.is_banned},"${u.subscription_tier ?? ''}","${u.subscription_end ?? ''}","${u.created_at ?? ''}"`
      ).join('\n')
      return new NextResponse(`${headers}\n${rows}`, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="erosia_users_export.csv"',
        },
      })
    }

    return apiResponse({
      totalGifts: totalGifts ?? 0,
      totalUsers: totalUsers ?? 0,
      pendingVerifs: pendingVerifs ?? 0,
      payouts: payouts ?? [],
    })
  } catch (err) {
    logger.error('Admin GET error', { error: String(err) })
    return apiServerError(err)
  }
}

export async function PATCH(request: Request) {
  try {
    const check = await checkAdmin()
    if (check.error) return apiError(check.error, check.status)

    let patchBody: Record<string, unknown>
    try { patchBody = await request.json() } catch { return apiError('Corps de requête invalide', 400) }
    const parsed = adminPatchSchema.safeParse(patchBody)
    if (!parsed.success) return apiError('Paramètres invalides', 400)
    const { txId, status } = parsed.data

    const admin = createAdminClient()
    const { error } = await admin.from('gift_transactions').update({ status }).eq('id', txId)
    if (error) {
      logger.error('Admin PATCH DB error', { error: error.message })
      return apiServerError(error)
    }

    await admin.from('admin_activity_log').insert({
      admin_id: check.userId,
      action: status === 'completed' ? 'payout_complete' : 'payout_fail',
      target_type: 'gift_transaction',
      target_id: txId,
    })

    return apiResponse({ success: true })
  } catch (err) {
    logger.error('Admin PATCH error', { error: String(err) })
    return apiServerError(err)
  }
}
