import { createClient } from '@/lib/supabase/server'
import { consentSchema } from '@/lib/validations'
import { logger } from '@/lib/logger'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return apiError('Corps de requête invalide')
    }
    const parsed = consentSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return apiError(firstError)
    }

    const { action_type, target_user_id, metadata } = parsed.data

    const { error } = await supabase.from('consent_log').insert({
      user_id: user.id,
      action_type,
      target_user_id: target_user_id || null,
      metadata: metadata || {},
    })

    if (error) return apiError(error.message)
    return apiResponse({ success: true })
  } catch (err) {
    logger.error('Consent POST error', { error: String(err) })
    return apiServerError(err)
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

    const { data, error } = await supabase
      .from('consent_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return apiError(error.message)
    return apiResponse(data)
  } catch (err) {
    logger.error('Consent GET error', { error: String(err) })
    return apiServerError(err)
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const { error } = await supabase
      .from('consent_log')
      .delete()
      .eq('user_id', user.id)
      .eq('action_type', 'consent_revoked')

    if (error) return apiError(error.message)

    await supabase.from('consent_log').insert({
      user_id: user.id,
      action_type: 'consent_revoked',
    })

    return apiResponse({ success: true })
  } catch (err) {
    logger.error('Consent DELETE error', { error: String(err) })
    return apiServerError(err)
  }
}
