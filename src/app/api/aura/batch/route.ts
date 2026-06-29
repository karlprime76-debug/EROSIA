import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeAura } from '@/lib/aura/engine'
import type { AuraConfig, AuraState } from '@/lib/aura/types'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { userIds } = await request.json()
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds requis' }, { status: 400 })
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, energy_score, trust_score, mood, last_seen, photos, bio, interests, onboarding_complete')
      .in('id', userIds)

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

      const config: AuraConfig = {
        userId: profile.id,
        energyScore: profile.energy_score,
        trustScore: profile.trust_score,
        mood: profile.mood,
        lastActiveAt: profile.last_seen,
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
