import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

const suspendSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().max(500).optional(),
  durationHours: z.number().int().positive().optional(),
})

const banSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().max(500).optional(),
})

const warnSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().max(500),
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
    const search = searchParams.get('search') ?? ''
    const status = searchParams.get('status') ?? 'all'
    const verification = searchParams.get('verification') ?? 'all'
    const premium = searchParams.get('premium') ?? 'all'
    const offset = (page - 1) * limit

    const admin = createAdminClient()
    let query = admin.from('profiles').select('id, name, email, age, location, photos, is_verified, verification_status, is_suspended, is_banned, warning_count, subscription_tier, subscription_end, created_at, is_admin', { count: 'exact' })

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }
    if (status === 'active') {
      query = query.eq('is_suspended', false).eq('is_banned', false)
    } else if (status === 'suspended') {
      query = query.eq('is_suspended', true)
    } else if (status === 'banned') {
      query = query.eq('is_banned', true)
    }
    if (verification === 'verified') {
      query = query.eq('is_verified', true)
    } else if (verification === 'unverified') {
      query = query.eq('is_verified', false)
    }
    if (premium === 'premium') {
      query = query.eq('subscription_tier', 'premium')
    } else if (premium === 'free') {
      query = query.or('subscription_tier.is.null,subscription_tier.neq.premium')
    }

    const { data, count, error } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    if (error) {
      logger.error('Admin users GET error', { error: error.message })
      return apiError('Erreur serveur', 500)
    }

    return apiResponse({
      users: data ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    })
  } catch (err) {
    logger.error('Admin users GET exception', { error: String(err) })
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
    const action = body._action as string
    const admin = createAdminClient()

    if (action === 'suspend') {
      const parsed = suspendSchema.safeParse(body)
      if (!parsed.success) return apiError('Paramètres invalides', 400)
      const { userId, reason, durationHours } = parsed.data
      const updates: Record<string, unknown> = {
        is_suspended: true,
        suspension_reason: reason ?? null,
        warning_count: admin.rpc('increment_warning', { p_user_id: userId }) as unknown as undefined,
      }
      if (durationHours) {
        updates.suspended_until = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()
      }
      await admin.from('profiles').update(updates).eq('id', userId)
      await admin.from('moderation_warnings').insert({
        user_id: userId,
        issued_by: check.adminId,
        reason: reason ?? 'Comportement inapproprié',
        severity: 'suspension',
        duration_hours: durationHours ?? null,
        expires_at: durationHours ? new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString() : null,
      })
      await logAdminAction(check.adminId!, 'suspend_user', 'user', userId, { reason })
      return apiResponse({ success: true })
    }

    if (action === 'ban') {
      const parsed = banSchema.safeParse(body)
      if (!parsed.success) return apiError('Paramètres invalides', 400)
      const { userId, reason } = parsed.data
      await admin.from('profiles').update({
        is_banned: true,
        is_suspended: false,
        suspension_reason: reason ?? null,
        is_visible: false,
      }).eq('id', userId)
      await admin.from('moderation_warnings').insert({
        user_id: userId,
        issued_by: check.adminId,
        reason: reason ?? 'Violation des conditions',
        severity: 'ban',
      })
      await logAdminAction(check.adminId!, 'ban_user', 'user', userId, { reason })
      return apiResponse({ success: true })
    }

    if (action === 'warn') {
      const parsed = warnSchema.safeParse(body)
      if (!parsed.success) return apiError('Paramètres invalides', 400)
      const { userId, reason } = parsed.data
      await admin.from('profiles').update({
        warning_count: admin.rpc('increment_warning', { p_user_id: userId }) as unknown as undefined,
      }).eq('id', userId)
      await admin.from('moderation_warnings').insert({
        user_id: userId,
        issued_by: check.adminId,
        reason,
        severity: 'warning',
      })
      await admin.from('notifications').insert({
        user_id: userId,
        type: 'moderation',
        title: 'Avertissement',
        message: `Tu as reçu un avertissement : ${reason}`,
      })
      await logAdminAction(check.adminId!, 'warn_user', 'user', userId, { reason })
      return apiResponse({ success: true })
    }

    return apiError('Action invalide', 400)
  } catch (err) {
    logger.error('Admin users PATCH error', { error: String(err) })
    return apiServerError(err)
  }
}
