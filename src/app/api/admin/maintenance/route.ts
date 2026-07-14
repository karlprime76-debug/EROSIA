import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    if (!profile?.is_admin) return apiError('Accès refusé', 403)

    let body: { active?: boolean; message?: string; estimated_duration?: string }
    try { body = await request.json() } catch { return apiError('Corps invalide', 400) }

    const admin = createAdminClient()
    const { data: current } = await admin.from('maintenance_mode').select('id, active').limit(1).maybeSingle()

    if (current) {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (body.active !== undefined) updates.active = body.active
      if (body.message !== undefined) updates.message = body.message
      if (body.estimated_duration !== undefined) updates.estimated_duration = body.estimated_duration
      if (body.active) updates.started_at = new Date().toISOString()
      updates.updated_by = user.id

      const { error } = await admin.from('maintenance_mode').update(updates).eq('id', current.id)
      if (error) {
        logger.error('Maintenance update error', { error: error.message })
        return apiServerError(error)
      }
    } else {
      const { error } = await admin.from('maintenance_mode').insert({
        active: body.active ?? false,
        message: body.message ?? 'Erosia est en maintenance.',
        estimated_duration: body.estimated_duration ?? null,
        updated_by: user.id,
      })
      if (error) {
        logger.error('Maintenance insert error', { error: error.message })
        return apiServerError(error)
      }
    }

    const action = body.active ? 'enabled' : 'disabled'
    await admin.from('maintenance_log').insert({
      action,
      message: body.message ?? null,
      performed_by: user.id,
    })

    return apiResponse({ success: true })
  } catch (err) {
    logger.error('Maintenance POST error', { error: String(err) })
    return apiServerError(err)
  }
}
