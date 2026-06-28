import { getEngine } from './registry'
import type {
  ScoringEngine, SparkInput, SparkOutput,
  CompatInput, CompatOutput,
  BehaviorInput, BehaviorOutput,
  TrustInput, TrustOutput,
  ActivityInput, ActivityOutput,
  ConversationInput, ConversationOutput,
  InterestGraphInput, InterestGraphOutput,
} from './types'
import { registerEngine } from './registry'

export class SparkScoreEngine implements ScoringEngine<SparkInput, SparkOutput> {
  name = 'spark-score'
  version = 1

  async compute(input: SparkInput): Promise<SparkOutput> {
    return computeSparkScore(input.userId, input.targetId)
  }
}

async function computeSparkScore(userId: string, targetId: string): Promise<SparkOutput> {
  const compatEngine = getEngine<CompatInput, CompatOutput>('compatibility')
  const behaviorEngine = getEngine<BehaviorInput, BehaviorOutput>('behavior')
  const trustEngine = getEngine<TrustInput, TrustOutput>('trust')
  const activityEngine = getEngine<ActivityInput, ActivityOutput>('activity')
  const conversationEngine = getEngine<ConversationInput, ConversationOutput>('conversation')
  const interestEngine = getEngine<InterestGraphInput, InterestGraphOutput>('interest-graph')

  const [
    compatResult, compatResultRev,
    behaviorResult, targetBehavior,
    trustResult,
    activityResult, targetActivity,
    conversationResult,
    interestResult,
  ] = await Promise.all([
    (await compatEngine?.compute({ userId, targetId }).catch(() => ({ score: 0, factors: {} }))) ?? { score: 0, factors: {} },
    (await compatEngine?.compute({ userId: targetId, targetId: userId }).catch(() => ({ score: 0, factors: {} }))) ?? { score: 0, factors: {} },
    (await behaviorEngine?.compute({ userId }).catch(() => ({ score: 0, signals: {} }))) ?? { score: 0, signals: {} },
    (await behaviorEngine?.compute({ userId: targetId }).catch(() => ({ score: 0, signals: {} }))) ?? { score: 0, signals: {} },
    (await trustEngine?.compute({ userId: targetId }).catch(() => ({ score: 50, flags: [] }))) ?? { score: 50, flags: [] },
    (await activityEngine?.compute({ userId }).catch(() => ({ score: 1 }))) ?? { score: 1 },
    (await activityEngine?.compute({ userId: targetId }).catch(() => ({ score: 1 }))) ?? { score: 1 },
    (await conversationEngine?.compute({ userId }).catch(() => ({ score: 0, metrics: {} }))) ?? { score: 0, metrics: {} },
    (await interestEngine?.compute({ userId, targetId }).catch(() => ({ shared: 0, related: 0, boost: 0, details: [] }))) ?? { shared: 0, related: 0, boost: 0, details: [] },
  ])

  // Poids
  const weights = {
    compatForward: 0.35,
    compatReverse: 0.15,
    behavior: 0.10,
    targetBehavior: 0.05,
    trust: 0.10,
    activitySelf: 0.05,
    activityTarget: 0.05,
    conversation: 0.10,
    interestBoost: 0.05,
  }

  const score =
    compatResult.score * weights.compatForward +
    compatResultRev.score * weights.compatReverse +
    behaviorResult.score * weights.behavior +
    targetBehavior.score * weights.targetBehavior +
    (trustResult.score / 100) * weights.trust +
    activityResult.score * weights.activitySelf +
    targetActivity.score * weights.activityTarget +
    conversationResult.score * weights.conversation +
    interestResult.boost * weights.interestBoost

  // Générer l'explication
  const parts: string[] = []

  if (interestResult.shared > 0) {
    parts.push(`vous partagez ${interestResult.shared} centre(s) d'intérêt`)
  }
  if (interestResult.related > 0) {
    parts.push(`vos centres d'intérêt sont complémentaires`)
  }

  const compatAverage = (compatResult.score + compatResultRev.score) / 2
  if (compatAverage > 0.6) {
    parts.push('votre compatibilité est élevée')
  } else if (compatAverage > 0.4) {
    parts.push('votre compatibilité est bonne')
  }

  if (trustResult.score >= 70) {
    parts.push('son profil est vérifié et actif')
  }

  // Vérifier si les deux sont actifs récemment
  const bothActive = activityResult.score > 0.5 && targetActivity.score > 0.5
  if (bothActive) {
    parts.push('vous êtes tous les deux actifs récemment')
  }

  const explanation = parts.length > 0
    ? `Nous vous proposons cette personne car ${parts.join(', ')}.`
    : 'Profil recommandé selon vos préférences.'

  return {
    score: Math.round(score * 10000) / 10000,
    explanation,
    factors: {
      compatibility: compatAverage,
      behavior: behaviorResult.score,
      trust: trustResult.score,
      activity: (activityResult.score + targetActivity.score) / 2,
      conversation: conversationResult.score,
      interestBoost: interestResult.boost,
    },
  }
}

export const sparkScoreEngine = new SparkScoreEngine()
registerEngine('spark-score', sparkScoreEngine)
