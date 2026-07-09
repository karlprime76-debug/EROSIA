import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeAura } from '@/lib/aura/engine'
import type { AuraConfig, AuraState } from '@/lib/aura/types'
import { logger } from '@/lib/logger'
import { auraBatchSchema } from '@/lib/validations'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    let body: Record<string, unknown>
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 }) }
    const parsed = auraBatchSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'userIds requis' }, { status: 400 })
    const { userIds } = parsed.data

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, photos, bio, interests, onboarding_complete')
      .in('id', userIds)

    const { data: scores } = await supabase
      .from('user_scores')
      .select('user_id, energy_score, trust_score')
      .in('user_id', userIds)

    const scoresMap = new Map(scores?.map(s => [s.user_id, s]) ?? [])
    const auras: Record<string, AuraState> = {}

    for (const profile of profiles ?? []) {
      const photoCount = (profile.photos ?? []).length
      const hasBio = (profile.bio?.trim().length ?? 0) > 20
      const interestCount = (profile.interests ?? []).length

      let completeness = 0
      if (photoCount >= 3) completeness += 6
      else if (photoCount >= 1) completeness += 3
      if (hasBio) completeness += 4
      if (interestCount >= 3) completeness += 3
      else if (interestCount >= 1) completeness += 2
      if (profile.onboarding_complete) completeness += 2

      const userScore = scoresMap.get(profile.id)
      const energyScore = userScore?.energy_score ? Math.round(userScore.energy_score * 100) : 50
      const trustScore = userScore?.trust_score ? Math.round(userScore.trust_score * 100) : 50

      const config: AuraConfig = {
        userId: profile.id,
        energyScore,
        trustScore,
        mood: 'discuter',
        lastActiveAt: null,
        profileCompleteness: completeness,
      }

      auras[profile.id] = computeAura(config)
    }

    return NextResponse.json({ auras })
  } catch (err) {
    logger.error('Aura batch error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
