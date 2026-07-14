import { createClient } from '@/lib/supabase/server'
import { DEFAULT_PRIVACY } from '@/lib/privacy'
import type { PrivacySettings } from '@/lib/privacy'
import { updatePrivacySchema } from '@/lib/validations'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const { data, error } = await supabase.from('privacy_settings').select('*').eq('user_id', user.id).maybeSingle()
    if (error) return apiError(error.message, 400)
    if (!data) {
      const { error: insError } = await supabase.from('privacy_settings').insert({ user_id: user.id })
      if (insError) return apiError(insError.message, 400)
      return apiResponse({ settings: DEFAULT_PRIVACY })
    }

    return apiResponse({ settings: data as PrivacySettings })
  } catch (err) {
    return apiServerError(err)
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return apiError('Corps de requête invalide', 400)
    }
    const parsed = updatePrivacySchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return apiError(firstError, 400)
    }

    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) updates[key] = value
    }
    if (Object.keys(updates).length === 0) return apiError('Aucune mise à jour', 400)

    const { error } = await supabase.from('privacy_settings').upsert({
      user_id: user.id,
      ...updates,
      updated_at: new Date().toISOString(),
    })
    if (error) return apiError(error.message, 400)

    return apiResponse({ success: true })
  } catch (err) {
    return apiServerError(err)
  }
}
