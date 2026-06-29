import { supabase } from '@/lib/supabase/client'
import { getEngine } from './registry'
import type {
  ScoringEngine,
  BehaviorInput, BehaviorOutput,
  ActivityInput, ActivityOutput,
  ConversationInput, ConversationOutput,
  TrustInput, TrustOutput,
} from './types'
import { registerEngine } from './registry'

export interface EnergyInput {
  userId: string
}

export interface EnergyOutput {
  score: number
  factors: Record<string, number>
}

export class EnergyScoreEngine implements ScoringEngine<EnergyInput, EnergyOutput> {
  name = 'energy-score'
  version = 1

  async compute(input: EnergyInput): Promise<EnergyOutput> {
    return computeEnergyScore(input.userId)
  }
}

async function computeEnergyScore(userId: string): Promise<EnergyOutput> {
  const behaviorEngine = getEngine<BehaviorInput, BehaviorOutput>('behavior')
  const activityEngine = getEngine<ActivityInput, ActivityOutput>('activity')
  const conversationEngine = getEngine<ConversationInput, ConversationOutput>('conversation')
  const trustEngine = getEngine<TrustInput, TrustOutput>('trust')

  const [
    activityResult,
    behaviorResult,
    conversationResult,
    trustResult,
  ] = await Promise.all([
    (await activityEngine?.compute({ userId }).catch(() => ({ score: 1 } as ActivityOutput))) ?? { score: 1 } as ActivityOutput,
    (await behaviorEngine?.compute({ userId }).catch(() => ({ score: 0, signals: {} } as BehaviorOutput))) ?? { score: 0, signals: {} } as BehaviorOutput,
    (await conversationEngine?.compute({ userId }).catch(() => ({ score: 0, metrics: {} } as ConversationOutput))) ?? { score: 0, metrics: {} } as ConversationOutput,
    (await trustEngine?.compute({ userId }).catch(() => ({ score: 50, flags: [] } as TrustOutput))) ?? { score: 50, flags: [] } as TrustOutput,
  ])

  const { data: profile } = await supabase
    .from('profiles')
    .select('photos, bio, interests, onboarding_complete')
    .eq('id', userId)
    .maybeSingle()

  const factors: Record<string, number> = {}

  // 1. Activité réelle (0-30)
  const activityScore = Math.round(activityResult.score * 30)
  factors.activity = activityScore

  // 2. Taux de réponse (0-25)
  const responseRate = behaviorResult.signals.replyRate ?? 0
  const responseScore = Math.round(responseRate * 25)
  factors.responseRate = responseScore

  // 3. Comportement : ghosting, reports (0-15)
  const ghostingRate = conversationResult.metrics.ghostingRate ?? 0
  const ghostScore = Math.round((1 - ghostingRate) * 15)
  factors.ghosting = ghostScore

  const reportFlags = trustResult.flags.filter(f => f.startsWith('signalé'))
  const reportCount = reportFlags.length > 0
    ? parseInt(reportFlags[0].match(/\d+/)?.[0] ?? '0', 10)
    : 0
  const reportPenalty = Math.min(reportCount * 15, 30)
  factors.reportPenalty = -reportPenalty

  // 4. Qualité des interactions (0-15)
  const avgResponseTime = conversationResult.metrics.avgResponseTime ?? 0
  const avgConversationLength = conversationResult.metrics.avgConversationLength ?? 0
  const interactionQuality = Math.round(((avgResponseTime + avgConversationLength) / 2) * 15)
  factors.interactionQuality = interactionQuality

  // 5. Qualité du profil (0-15)
  let profileQuality = 0
  if (profile) {
    const photoCount = (profile.photos ?? []).length
    if (photoCount >= 3) profileQuality += 5
    else if (photoCount >= 1) profileQuality += 2
    if (profile.bio && profile.bio.trim().length > 20) profileQuality += 4
    else if (profile.bio && profile.bio.trim().length > 0) profileQuality += 2
    const interestCount = (profile.interests ?? []).length
    if (interestCount >= 3) profileQuality += 4
    else if (interestCount >= 1) profileQuality += 2
    if (profile.onboarding_complete) profileQuality += 2
  }
  factors.profileQuality = profileQuality

  const score = Math.max(0, Math.min(100,
    activityScore + responseScore + ghostScore + reportPenalty + interactionQuality + profileQuality
  ))

  return {
    score,
    factors: {
      activity: activityScore,
      responseRate: responseScore,
      ghosting: ghostScore,
      reportPenalty,
      interactionQuality,
      profileQuality,
      trustBase: trustResult.score,
    },
  }
}

export const energyScoreEngine = new EnergyScoreEngine()
registerEngine('energy-score', energyScoreEngine)
