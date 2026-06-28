import { supabase } from '@/lib/supabase/client'
import { getEngine } from './registry'
import type { ScoringEngine, RecommendInput, RecommendOutput, SparkInput, SparkOutput } from './types'

const PAGE_SIZE = 20

export class RecommendationEngine implements ScoringEngine<RecommendInput, RecommendOutput> {
  name = 'recommendation'
  version = 1

  async compute(input: RecommendInput): Promise<RecommendOutput> {
    return getRecommendations(input)
  }
}

async function getRecommendations(input: RecommendInput): Promise<RecommendOutput> {
  const { userId, excludeIds: extraExclude, page = 0, limit = PAGE_SIZE } = input
  const filters = input.filters ?? {}

  // 1. Construire la requête de base
  let query = supabase
    .from('profiles')
    .select('id, name, age, photos, looking_for, last_seen, created_at, location, latitude, longitude, bio, interests, is_verified', { count: 'exact' })
    .eq('onboarding_complete', true)
    .neq('id', userId)

  // Exclure les déjà swipés/bloqués
  const { data: swiped } = await supabase
    .from('swipes')
    .select('swiped_id')
    .eq('swiper_id', userId)
  const swipedIds = (swiped ?? []).map(s => s.swiped_id)

  const { data: blocked } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', userId)
  const blockedIds = (blocked ?? []).map(b => b.blocked_id)

  const allExclude = [...new Set([...extraExclude, ...swipedIds, ...blockedIds, userId])]
  if (allExclude.length > 0) {
    query = query.not('id', 'in', `(${allExclude.join(',')})`)
  }

  // Filtres optionnels
  if (filters.minAge) query = query.gte('age', filters.minAge)
  if (filters.maxAge) query = query.lte('age', filters.maxAge)
  if (filters.lookingFor) query = query.eq('looking_for', filters.lookingFor)

  // Filtre distance (bounding box)
  if (filters.lat && filters.lng && filters.maxDistance) {
    const latDelta = filters.maxDistance / 111
    const lngDelta = filters.maxDistance / (111 * Math.cos(filters.lat * Math.PI / 180))
    query = query
      .gte('latitude', filters.lat - latDelta)
      .lte('latitude', filters.lat + latDelta)
      .gte('longitude', filters.lng - lngDelta)
      .lte('longitude', filters.lng + lngDelta)
  }

  if (filters.city) {
    query = query.ilike('location', `%${filters.city}%`)
  }

  const { data: profiles, count } = await query

  if (!profiles || profiles.length === 0) {
    return { profiles: [], total: 0, page, explanations: {} }
  }

  // 2. Calculer les scores pour chaque profil
  interface ScoredProfile {
    id: string
    score: number
    explanation: string
  }

  const sparkEngine = getEngine<SparkInput, SparkOutput>('spark-score')

  const scored: ScoredProfile[] = []
  const batchSize = 25
  for (let i = 0; i < profiles.length; i += batchSize) {
    const batch = profiles.slice(i, i + batchSize)
    const results = await Promise.allSettled(
      batch.map(async (profile) => {
        if (sparkEngine) {
          const result = await sparkEngine.compute({ userId, targetId: profile.id })
          return {
            id: profile.id,
            score: result.score,
            explanation: result.explanation,
          }
        }
        return { id: profile.id, score: 0.5, explanation: '' }
      }),
    )
    for (const r of results) {
      if (r.status === 'fulfilled') scored.push(r.value)
    }
  }

  // 3. Trier par score descendant
  scored.sort((a, b) => b.score - a.score)

  // 4. Pagination
  const start = page * limit
  const paged = scored.slice(start, start + limit)

  const explanations: Record<string, string> = {}
  for (const s of paged) {
    explanations[s.id] = s.explanation
  }

  return {
    profiles: paged.map(s => s.id),
    total: count ?? profiles.length,
    page,
    explanations,
  }
}

export const recommendationEngine = new RecommendationEngine()
