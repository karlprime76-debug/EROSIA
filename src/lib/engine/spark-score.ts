import { supabase } from '@/lib/supabase/client'
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
import type { Mood, LookingFor } from '@/lib/api'
import { registerEngine } from './registry'

export class SparkScoreEngine implements ScoringEngine<SparkInput, SparkOutput> {
  name = 'spark-score'
  version = 3

  async compute(input: SparkInput): Promise<SparkOutput> {
    return computeSparkScore(input.userId, input.targetId)
  }
}

const MOOD_COMPAT: Record<Mood, Mood[]> = {
  discuter: ['discuter', 'chill', 'de_passage'],
  rencontre: ['rencontre', 'disponible_ce_soir', 'relation_serieuse'],
  disponible_ce_soir: ['disponible_ce_soir', 'rencontre', 'relation_serieuse'],
  relation_serieuse: ['relation_serieuse', 'rencontre', 'discuter'],
  chill: ['chill', 'discuter', 'de_passage'],
  de_passage: ['de_passage', 'discuter', 'chill'],
}

const LOOKING_FOR_COMPAT: Record<LookingFor, LookingFor[]> = {
  friendship: ['friendship', 'casual', 'open'],
  casual: ['casual', 'fwb', 'open'],
  fwb: ['fwb', 'casual', 'open'],
  serious: ['serious'],
  open: ['open', 'casual', 'fwb', 'friendship'],
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
    profilePair,
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
    getProfilePair(userId, targetId),
  ])

  // Facteurs additionnels
  const moodScore = computeMoodScore(profilePair.myMood, profilePair.theirMood)
  const lookingForScore = computeLookingForScore(profilePair.myLookingFor, profilePair.theirLookingFor)
  const proximityBonus = computeProximityBonus(
    profilePair.myLat, profilePair.myLng,
    profilePair.theirLat, profilePair.theirLng,
  )
  const activityRecency = computeActivityRecency(profilePair.theirLastSeen)
  const behavioralCompat = computeBehavioralCompat(behaviorResult, targetBehavior)

  // Poids ajustés
  const weights = {
    compatForward: 0.20,
    compatReverse: 0.10,
    behavior: 0.05,
    targetBehavior: 0.05,
    trust: 0.08,
    activitySelf: 0.03,
    activityTarget: 0.04,
    conversation: 0.05,
    interestBoost: 0.05,
    mood: 0.10,
    lookingFor: 0.10,
    proximity: 0.05,
    activityRecency: 0.05,
    behavioralCompat: 0.05,
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
    interestResult.boost * weights.interestBoost +
    moodScore * weights.mood +
    lookingForScore * weights.lookingFor +
    proximityBonus * weights.proximity +
    activityRecency * weights.activityRecency +
    behavioralCompat * weights.behavioralCompat

  const parts: string[] = buildExplanation(
    interestResult, compatResult, compatResultRev,
    trustResult, activityResult, targetActivity,
    moodScore, lookingForScore, proximityBonus,
    activityRecency, behavioralCompat,
  )

  const compatAverage = (compatResult.score + compatResultRev.score) / 2

  return {
    score: Math.round(score * 10000) / 10000,
    explanation: parts.length > 0
      ? `Nous vous proposons cette personne car ${parts.join(', ')}.`
      : 'Profil recommandé selon vos préférences.',
    factors: {
      compatibility: compatAverage,
      behavior: behaviorResult.score,
      trust: trustResult.score,
      activity: (activityResult.score + targetActivity.score) / 2,
      conversation: conversationResult.score,
      interestBoost: interestResult.boost,
      mood: moodScore,
      lookingFor: lookingForScore,
      proximity: proximityBonus,
      activityRecency,
      behavioralCompat,
    },
  }
}

async function getProfilePair(userId: string, targetId: string) {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, mood, looking_for, last_seen, latitude, longitude')
    .in('id', [userId, targetId])

  const myProfile = profiles?.find(p => p.id === userId)
  const theirProfile = profiles?.find(p => p.id === targetId)

  return {
    myMood: (myProfile?.mood ?? 'discuter') as Mood,
    theirMood: (theirProfile?.mood ?? 'discuter') as Mood,
    myLookingFor: (myProfile?.looking_for ?? 'friendship') as LookingFor,
    theirLookingFor: (theirProfile?.looking_for ?? 'friendship') as LookingFor,
    myLat: myProfile?.latitude ?? null,
    myLng: myProfile?.longitude ?? null,
    theirLat: theirProfile?.latitude ?? null,
    theirLng: theirProfile?.longitude ?? null,
    theirLastSeen: theirProfile?.last_seen ?? null,
  }
}

function computeMoodScore(myMood: Mood, theirMood: Mood): number {
  const isCompat = MOOD_COMPAT[myMood]?.includes(theirMood) ?? false
  return isCompat ? 1 : 0.3
}

function computeLookingForScore(myLF: LookingFor, theirLF: LookingFor): number {
  if (myLF === theirLF) return 1
  const isCompat = LOOKING_FOR_COMPAT[myLF]?.includes(theirLF) ?? false
  return isCompat ? 0.7 : 0.2
}

function computeProximityBonus(myLat: number | null, myLng: number | null, theirLat: number | null, theirLng: number | null): number {
  if (!myLat || !myLng || !theirLat || !theirLng) return 0.5
  const R = 6371
  const dLat = (theirLat - myLat) * Math.PI / 180
  const dLng = (theirLng - myLng) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(myLat * Math.PI / 180) * Math.cos(theirLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  if (distance <= 5) return 1
  if (distance <= 15) return 0.9
  if (distance <= 30) return 0.7
  if (distance <= 50) return 0.5
  if (distance <= 100) return 0.3
  return 0.1
}

function computeActivityRecency(lastSeen: string | null): number {
  if (!lastSeen) return 0.2
  const daysSince = (Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSince <= 1) return 1
  if (daysSince <= 3) return 0.9
  if (daysSince <= 7) return 0.7
  if (daysSince <= 14) return 0.5
  if (daysSince <= 30) return 0.3
  return 0.1
}

function computeBehavioralCompat(myBehavior: BehaviorOutput, targetBehavior: BehaviorOutput): number {
  const myLikeRatio = myBehavior.signals.likeRatio ?? 0.5
  const theirLikeRatio = targetBehavior.signals.likeRatio ?? 0.5
  const ratioDiff = Math.abs(myLikeRatio - theirLikeRatio)
  // Similar like/pass ratio = more compatible
  return Math.max(0, 1 - ratioDiff)
}

function buildExplanation(
  interestResult: { shared: number; related: number },
  compatResult: { score: number },
  compatResultRev: { score: number },
  trustResult: { score: number },
  activityResult: { score: number },
  targetActivity: { score: number },
  moodScore: number,
  lookingForScore: number,
  proximityBonus: number,
  activityRecency: number,
  behavioralCompat: number,
): string[] {
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

  const bothActive = activityResult.score > 0.5 && targetActivity.score > 0.5
  if (bothActive) {
    parts.push('vous êtes tous les deux actifs récemment')
  }

  if (moodScore >= 0.8) {
    parts.push('vos moods sont compatibles')
  }

  if (lookingForScore >= 0.7) {
    parts.push('vos intentions sont alignées')
  }

  if (proximityBonus >= 0.7) {
    parts.push('vous êtes géographiquement proches')
  }

  if (activityRecency >= 0.7) {
    parts.push('cette personne est très active')
  }

  if (behavioralCompat >= 0.7) {
    parts.push('vos comportements sont similaires')
  }

  return parts
}

export const sparkScoreEngine = new SparkScoreEngine()
registerEngine('spark-score', sparkScoreEngine)
