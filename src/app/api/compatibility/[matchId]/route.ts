import { createClient } from '@/lib/supabase/server'
import { ensureCriteriaRegistered } from '@/lib/engine/compat-center/setup'
import { computeCompatibility } from '@/lib/engine/compat-center/engine'
import type { ProfileSnapshot } from '@/lib/engine/compat-center/types'
import { z } from 'zod'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  try {
    const { matchId } = await params
    const parsed = z.string().uuid().safeParse(matchId)
    if (!parsed.success) return apiError('ID de match invalide')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Non authentifié', 401)

    const { data: match } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .eq('id', matchId)
      .maybeSingle()

    if (!match) return apiError('Match introuvable', 404)

    const uid = user.id
    if (match.user1_id !== uid && match.user2_id !== uid) {
      return apiError('Non autorisé', 403)
    }

    const targetId = match.user1_id === uid ? match.user2_id : match.user1_id

    const [profilesResult, quizA, quizB, traitsA, traitsB] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, age, bio, occupation, location, interests, mood, looking_for, energy_score, photos')
        .in('id', [uid, targetId]),
      supabase.from('quiz_answers').select('question_id').eq('user_id', uid),
      supabase.from('quiz_answers').select('question_id').eq('user_id', targetId),
      supabase.rpc('get_user_top_traits', { p_user_id: uid }),
      supabase.rpc('get_user_top_traits', { p_user_id: targetId }),
    ])

    const profiles = profilesResult.data
    if (!profiles || profiles.length < 2) {
      return apiError('Profils introuvables', 404)
    }

    const myProfile = profiles.find(p => p.id === uid)!
    const targetProfile = profiles.find(p => p.id === targetId)!

    const makeSnapshot = (p: typeof myProfile, traits: Array<{ trait: string }>, hasQuiz: boolean): ProfileSnapshot => ({
      id: p.id,
      name: p.name,
      age: p.age,
      bio: p.bio,
      occupation: p.occupation,
      location: p.location,
      interests: p.interests ?? [],
      mood: p.mood,
      looking_for: p.looking_for,
      energy_score: p.energy_score,
      traits: (traits ?? []).map(t => t.trait),
      has_quiz: hasQuiz,
    })

    const userA = makeSnapshot(myProfile, traitsA.data ?? [], (quizA.data ?? []).length > 0)
    const userB = makeSnapshot(targetProfile, traitsB.data ?? [], (quizB.data ?? []).length > 0)

    ensureCriteriaRegistered()

    const report = await computeCompatibility(
      matchId, uid, targetId, targetProfile.name, targetProfile.photos?.[0] ?? null,
      userA, userB,
    )

    return apiResponse(report)
  } catch (err) {
    return apiServerError(err)
  }
}
