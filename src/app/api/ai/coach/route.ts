import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeProfile } from '@/lib/coach'
import { logger } from '@/lib/logger'
import { coachSchema } from '@/lib/validations'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

const COACH_PROFILE_FIELDS = 'id, name, age, bio, occupation, location, photos, interests, is_verified, looking_for, mood, video_url'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return apiError('Corps de requête invalide', 400)
    }
    const parsed = coachSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return apiError(firstError, 400)
    }

    const { profileId } = parsed.data

    const [profileRes, scoresRes] = await Promise.all([
      supabase.from('profiles').select(COACH_PROFILE_FIELDS).eq('id', profileId).maybeSingle(),
      supabase.from('user_scores').select('energy_score, trust_score').eq('user_id', profileId).maybeSingle(),
    ])
    const profile = profileRes.data
    const profileErr = profileRes.error
    if (profileErr || !profile) {
      return apiError('Profil introuvable', 404)
    }
    const scores = scoresRes.data

    const result = await analyzeProfile({
      name: profile.name,
      bio: profile.bio,
      photos: profile.photos,
      interests: profile.interests,
      occupation: profile.occupation,
      location: profile.location,
      age: profile.age,
      is_verified: profile.is_verified,
      video_url: profile.video_url,
      mood: profile.mood,
      looking_for: profile.looking_for,
      energy_score: scores?.energy_score ? Math.round(scores.energy_score * 100) : null,
    })

    return apiResponse(result, 200)
  } catch (err) {
    logger.error('Coach POST error', { error: String(err) })
    return apiServerError(err)
  }
}
