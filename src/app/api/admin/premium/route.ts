import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'
import { logger } from '@/lib/logger'

const grantSchema = z.object({
  userId: z.string().uuid(),
  plan: z.enum(['premium_monthly', 'premium_yearly']).optional().default('premium_monthly'),
  durationMonths: z.number().int().positive().optional(),
})

const revokeSchema = z.object({
  userId: z.string().uuid(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    if (!profile?.is_admin) return apiError('Accès refusé', 403)

    let body: Record<string, unknown>
    try { body = await request.json() } catch {
      return apiError('Corps de requête invalide', 400)
    }
    const action = body._action as string
    const admin = createAdminClient()

    if (action === 'grant') {
      const parsed = grantSchema.safeParse(body)
      if (!parsed.success) return apiError('Paramètres invalides', 400)
      const { userId, plan, durationMonths } = parsed.data
      const endDate = durationMonths
        ? new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

      await admin.from('profiles').update({
        subscription_tier: 'premium',
        subscription_plan: plan,
        subscription_start: new Date().toISOString(),
        subscription_end: endDate,
        is_premium: true,
      }).eq('id', userId)

      await admin.from('notifications').insert({
        user_id: userId,
        type: 'premium',
        title: 'Premium activé',
        message: 'Ton abonnement Premium a été activé par l\'administration.',
      })

      await admin.from('admin_activity_log').insert({
        admin_id: user.id,
        action: 'grant_premium',
        target_type: 'user',
        target_id: userId,
        details: { plan, durationMonths },
      })

      return apiResponse({ success: true })
    }

    if (action === 'revoke') {
      const parsed = revokeSchema.safeParse(body)
      if (!parsed.success) return apiError('Paramètres invalides', 400)
      const { userId } = parsed.data

      await admin.from('profiles').update({
        subscription_tier: null,
        subscription_plan: null,
        subscription_end: null,
        subscription_start: null,
        is_premium: false,
      }).eq('id', userId)

      await admin.from('notifications').insert({
        user_id: userId,
        type: 'premium',
        title: 'Premium désactivé',
        message: 'Ton abonnement Premium a été désactivé par l\'administration.',
      })

      await admin.from('admin_activity_log').insert({
        admin_id: user.id,
        action: 'revoke_premium',
        target_type: 'user',
        target_id: userId,
      })

      return apiResponse({ success: true })
    }

    return apiError('Action invalide', 400)
  } catch (err) {
    logger.error('Admin premium POST error', { error: String(err) })
    return apiServerError(err)
  }
}
