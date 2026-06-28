import { supabase } from '@/lib/supabase/client'
import type { ScoringEngine, ActivityInput, ActivityOutput } from './types'
import { registerEngine } from './registry'

export class ActivityEngine implements ScoringEngine<ActivityInput, ActivityOutput> {
  name = 'activity'
  version = 1

  async compute(input: ActivityInput): Promise<ActivityOutput> {
    return computeActivity(input.userId)
  }
}

async function computeActivity(userId: string): Promise<ActivityOutput> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at, last_seen, last_active_at')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) return { score: 0 }

  let score = 1.0

  // Décroissance temporelle
  let lastActive = 0
  if (profile.last_active_at) {
    const ts = new Date(profile.last_active_at).getTime()
    if (Number.isFinite(ts)) lastActive = ts
  }
  if (!lastActive && profile.last_seen) {
    const ts = new Date(profile.last_seen).getTime()
    if (Number.isFinite(ts)) lastActive = ts
  }

  if (lastActive > 0) {
    const daysSinceActive = (Date.now() - lastActive) / (1000 * 60 * 60 * 24)
    score = Math.max(0, score - daysSinceActive * 0.1)
  }

  // Boost nouveaux membres (7 premiers jours)
  const accountAge = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
  if (accountAge <= 7) {
    score = Math.min(1, score + 0.2)
  }

  // Connexion quotidienne = reset partiel du decay
  const { count: recentActions } = await supabase
    .from('behavior_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  if ((recentActions ?? 0) > 0) {
    score = Math.min(1, score + 0.05)
  }

  return { score: Math.round(score * 100) / 100 }
}

export const activityEngine = new ActivityEngine()
registerEngine('activity', activityEngine)
