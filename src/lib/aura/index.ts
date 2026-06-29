import { supabase as sbClient } from '@/lib/supabase/client'
import { computeAura } from './engine'
import type { AuraState, AuraConfig } from './types'

export type { AuraState, AuraLabel, AuraConfig } from './types'

function supabase() {
  return sbClient
}

export async function getAura(userId?: string): Promise<{ data: AuraState | null; error?: string }> {
  const { data: { user } } = await supabase().auth.getUser()
  const uid = userId ?? user?.id
  if (!uid) return { data: null, error: 'Not authenticated' }

  const { data, error } = await supabase()
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

export async function computeAndSaveAura(userId: string): Promise<{ data: AuraState | null; error?: string }> {
  const { data: profile } = await supabase()
    .from('profiles')
    .select('id, energy_score, trust_score, mood, last_seen, photos, bio, interests, onboarding_complete')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) return { data: null, error: 'Profil introuvable' }

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
    userId,
    energyScore: profile.energy_score,
    trustScore: profile.trust_score,
    mood: profile.mood,
    lastActiveAt: profile.last_seen,
    profileCompleteness: completeness,
  }

  const state = computeAura(config)

  const { error: upsertError } = await supabase()
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
