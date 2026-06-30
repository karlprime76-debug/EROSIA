import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase as sbClient } from '@/lib/supabase/client'
import { computeAura } from './engine'
import type { AuraState, AuraConfig } from './types'

export type { AuraState, AuraLabel, AuraConfig } from './types'

function getClient(supabase?: SupabaseClient) {
  return supabase ?? sbClient
}

export async function getAura(userId?: string, supabase?: SupabaseClient): Promise<{ data: AuraState | null; error?: string }> {
  const client = getClient(supabase)
  const { data: { user } } = await client.auth.getUser()
  const uid = userId ?? user?.id
  if (!uid) return { data: null, error: 'Not authenticated' }

  const { data, error } = await client
    .from('aura_snapshots')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle()

  if (error) return { data: null, error: error.message }
  if (data) {
    return {
      data: {
        level: data.level,
        color: data.color,
        secondaryColor: data.secondary_color,
        glowIntensity: data.glow_intensity,
        particleCount: data.particle_count,
        label: data.label,
        factors: data.factors,
        updatedAt: data.updated_at,
      },
    }
  }

  return { data: null, error: 'Aura non calculée' }
}

export async function computeAndSaveAura(userId: string, supabase?: SupabaseClient): Promise<{ data: AuraState | null; error?: string }> {
  const client = getClient(supabase)

  const { data: profile } = await client
    .from('profiles')
    .select('id, photos, bio, interests, onboarding_complete')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) return { data: null, error: 'Profil introuvable' }

  const { data: userScore } = await client
    .from('user_scores')
    .select('energy_score, trust_score')
    .eq('user_id', userId)
    .maybeSingle()

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

  const energyScore = userScore?.energy_score ? Math.round(userScore.energy_score * 100) : 50
  const trustScore = userScore?.trust_score ? Math.round(userScore.trust_score * 100) : 50

  const config: AuraConfig = {
    userId,
    energyScore,
    trustScore,
    mood: 'discuter',
    lastActiveAt: null,
    profileCompleteness: completeness,
  }

  const state = computeAura(config)

  const { error: upsertError } = await client
    .from('aura_snapshots')
    .upsert({
      user_id: userId,
      level: state.level,
      color: state.color,
      secondary_color: state.secondaryColor,
      glow_intensity: state.glowIntensity,
      particle_count: state.particleCount,
      label: state.label,
      factors: state.factors,
      updated_at: state.updatedAt,
    }, { onConflict: 'user_id' })

  if (upsertError) return { data: null, error: upsertError.message }

  return { data: state }
}
