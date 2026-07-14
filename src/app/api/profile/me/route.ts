import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { sanitize } from '@/lib/sanitize'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

const SANITIZE_FIELDS = ['name', 'bio', 'occupation', 'location'] as const

const ALLOWED_UPDATE_FIELDS = new Set([
  'name', 'bio', 'occupation', 'location',
  'visibility', 'notif_push', 'notif_email',
  'latitude', 'longitude',
  'gender', 'interested_in',
  'looking_for', 'mood',
  'travel_city', 'travel_active',
])

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return apiError('Non authentifié', 401)
    }

    let body: Record<string, unknown>
    try { body = await request.json() } catch {
      return apiError('Corps de requête invalide')
    }
    const updates: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_UPDATE_FIELDS.has(key)) continue
      if (SANITIZE_FIELDS.includes(key as typeof SANITIZE_FIELDS[number])) {
        if (typeof value === 'string') updates[key] = sanitize(value, 500)
        else updates[key] = value
      } else {
        updates[key] = value
      }
    }

    if (Object.keys(updates).length === 0) {
      return apiError('Aucun champ valide à mettre à jour')
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .maybeSingle()

    if (error) {
      logger.error('Profile update error', { userId: user.id, error: error.message })
      return apiError(error.message, 500)
    }

    return apiResponse({ profile: data })
  } catch (err) {
    logger.error('[/api/profile/me] PATCH exception', err)
    return apiServerError(err)
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return apiError('Non authentifié', 401)
    }

    const { data: profile, error: selErr } = await supabase
      .from('profiles')
      .select('id, name, age, bio, occupation, location, photos, interests, is_verified, verification_status, verified_at, looking_for, created_at, is_admin, energy_score, trust_score, gender, interested_in, mood, subscription_tier')
      .eq('id', user.id)
      .maybeSingle()

    if (selErr) {
      logger.error('Profile select error', { userId: user.id, error: selErr.message })
      return apiError('Erreur lors du chargement du profil', 500)
    }

    const res = apiResponse({ profile, userId: user.id })
    res.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
    return res
  } catch (err) {
    logger.error('[/api/profile/me] exception', err)
    return apiServerError(err)
  }
}
