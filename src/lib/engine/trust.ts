import { supabase } from '@/lib/supabase/client'
import type { ScoringEngine, TrustInput, TrustOutput } from './types'
import { registerEngine } from './registry'

export class TrustEngine implements ScoringEngine<TrustInput, TrustOutput> {
  name = 'trust'
  version = 1

  async compute(input: TrustInput): Promise<TrustOutput> {
    return computeTrust(input.userId)
  }
}

async function computeTrust(userId: string): Promise<TrustOutput> {
  const flags: string[] = []

  // Charger le profil
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_verified, created_at, photos, bio, interests, onboarding_complete, last_seen')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) return { score: 0, flags: ['profil_introuvable'] }

  let score = 50
  const reasons: string[] = []

  // Vérification (30%)
  if (profile.is_verified) {
    score += 15; reasons.push('verifié')
  } else {
    score -= 5; reasons.push('non_verifié')
  }

  // Ancienneté (15%) — bonus log
  const accountAge = Date.now() - new Date(profile.created_at).getTime()
  const ageDays = accountAge / (1000 * 60 * 60 * 24)
  score += Math.min(Math.floor(ageDays / 30) * 2, 10)
  if (ageDays < 1) flags.push('nouveau_compte')

  // Qualité du profil (20%)
  let quality = 0
  const photoCount = (profile.photos ?? []).length
  if (photoCount >= 3) quality += 2
  else if (photoCount >= 1) quality += 1
  else quality -= 2

  if (profile.bio && profile.bio.trim().length > 20) quality += 1.5
  else quality -= 1

  const interestCount = (profile.interests ?? []).length
  if (interestCount >= 3) quality += 1.5
  else if (interestCount === 0) quality -= 1

  if (profile.onboarding_complete) quality += 1
  score += quality * 5

  if (quality < 0) flags.push('profil_incomplet')

  // Signalements (pénalité -25%)
  const { count: reportCount } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('reported_id', userId)
  const reports = reportCount ?? 0
  score -= Math.min(reports * 10, 30)
  if (reports > 0) flags.push(`signalé_${reports}_fois`)

  // Activité récente (5%)
  const lastSeen = profile.last_seen ? new Date(profile.last_seen).getTime() : 0
  const daysSinceActive = (Date.now() - lastSeen) / (1000 * 60 * 60 * 24)
  if (daysSinceActive < 7) {
    score += 5
  } else if (daysSinceActive > 30) {
    score -= 5; flags.push('inactif_+30j')
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    flags,
  }
}

export const trustEngine = new TrustEngine()
registerEngine('trust', trustEngine)
