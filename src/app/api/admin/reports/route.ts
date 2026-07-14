import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

const updateReportSchema = z.object({
  reportId: z.string().uuid(),
  status: z.enum(['dismissed', 'action_taken']),
  actionNote: z.string().max(500).optional(),
  actionUserId: z.string().uuid().optional(),
  actionType: z.enum(['warn', 'suspend', 'ban']).optional(),
})

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié', status: 401, adminId: null }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) return { error: 'Accès refusé', status: 403, adminId: null }
  return { error: null, status: 200, adminId: user.id }
}

async function logAdminAction(adminId: string, action: string, targetType: string, targetId: string, details?: Record<string, unknown>) {
  const admin = createAdminClient()
  await admin.from('admin_activity_log').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details: details ?? null,
  })
}

export async function GET(request: Request) {
  try {
    const check = await checkAdmin()
    if (check.error) return apiError(check.error, check.status)

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
    const category = searchParams.get('category') ?? 'all'
    const status = searchParams.get('status') ?? 'all'
    const offset = (page - 1) * limit

    const admin = createAdminClient()
    let query = admin
      .from('moderation_reports')
      .select('*, reporter:profiles!moderation_reports_reporter_id_fkey(id, name, email), reported:profiles!moderation_reports_reported_id_fkey(id, name, email)', { count: 'exact' })

    if (category !== 'all') query = query.eq('category', category)
    if (status !== 'all') query = query.eq('status', status)

    const { data, count, error } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    if (error) {
      logger.error('Admin reports GET error', { error: error.message })
      return apiError('Erreur serveur', 500)
    }

    return apiResponse({
      reports: data ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    })
  } catch (err) {
    logger.error('Admin reports GET exception', { error: String(err) })
    return apiServerError(err)
  }
}

export async function PATCH(request: Request) {
  try {
    const check = await checkAdmin()
    if (check.error) return apiError(check.error, check.status)

    let body: Record<string, unknown>
    try { body = await request.json() } catch {
      return apiError('Corps de requête invalide', 400)
    }
    const parsed = updateReportSchema.safeParse(body)
    if (!parsed.success) return apiError('Paramètres invalides', 400)

    const { reportId, status, actionNote, actionUserId, actionType } = parsed.data
    const admin = createAdminClient()

    const { error: updateError } = await admin.from('moderation_reports').update({
      status,
      reviewed_by: check.adminId,
      reviewed_at: new Date().toISOString(),
    }).eq('id', reportId)

    if (updateError) {
      logger.error('Admin reports PATCH DB error', { error: updateError.message })
      return apiError('Erreur serveur', 500)
    }

    if (status === 'action_taken' && actionUserId && actionType) {
      if (actionType === 'warn') {
        await admin.from('profiles').update({
          warning_count: admin.rpc('increment_warning', { p_user_id: actionUserId }) as unknown as undefined,
        }).eq('id', actionUserId)
        await admin.from('moderation_warnings').insert({
          user_id: actionUserId,
          issued_by: check.adminId,
          reason: actionNote ?? 'Signalement confirmé',
          severity: 'warning',
        })
      } else if (actionType === 'suspend') {
        await admin.from('profiles').update({
          is_suspended: true,
          suspension_reason: actionNote ?? null,
        }).eq('id', actionUserId)
        await admin.from('moderation_warnings').insert({
          user_id: actionUserId,
          issued_by: check.adminId,
          reason: actionNote ?? 'Suspension suite signalement',
          severity: 'suspension',
        })
      } else if (actionType === 'ban') {
        await admin.from('profiles').update({
          is_banned: true,
          is_suspended: false,
          suspension_reason: actionNote ?? null,
          is_visible: false,
        }).eq('id', actionUserId)
        await admin.from('moderation_warnings').insert({
          user_id: actionUserId,
          issued_by: check.adminId,
          reason: actionNote ?? 'Bannissement suite signalement',
          severity: 'ban',
        })
      }
    }

    await logAdminAction(check.adminId!, `report_${status}`, 'report', reportId, { actionNote, actionUserId, actionType })
    return apiResponse({ success: true })
  } catch (err) {
    logger.error('Admin reports PATCH exception', { error: String(err) })
      return apiServerError(err)
  }
}
