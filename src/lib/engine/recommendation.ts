import { supabase as browserClient } from '@/lib/supabase/client'
import { registerEngine } from './registry'
import type { ScoringEngine, RecommendInput, RecommendOutput, SupabaseClientLike } from './types'

const PAGE_SIZE = 20

export class RecommendationEngine implements ScoringEngine<RecommendInput, RecommendOutput> {
  name = 'recommendation'
  version = 2

  async compute(input: RecommendInput, db?: SupabaseClientLike): Promise<RecommendOutput> {
    return getRecommendations(input, db ?? browserClient)
  }
}

async function getRecommendations(input: RecommendInput, db: SupabaseClientLike): Promise<RecommendOutput> {
  const { userId, excludeIds: extraExclude, page = 0, limit = PAGE_SIZE } = input
  const filters = input.filters ?? {}

  // 1. Construire la requête de base
  let query = db
    .from('profiles')
    .select('id', { count: 'exact' })
    .eq('onboarding_complete', true)
    .neq('id', userId)

  // Exclure les déjà swipés
  const [{ data: swiped }, { data: blockedByMe }, { data: blockedMe }] = await Promise.all([
    db.from('swipes').select('swiped_id').eq('swiper_id', userId),
    db.from('blocks').select('blocked_id').eq('blocker_id', userId),
    db.from('blocks').select('blocker_id').eq('blocked_id', userId),
  ])
  const swipedIds = (swiped ?? []).map((s: { swiped_id: string }) => s.swiped_id)
  const blockedIds = [
    ...(blockedByMe ?? []).map((b: { blocked_id: string }) => b.blocked_id),
    ...(blockedMe ?? []).map((b: { blocker_id: string }) => b.blocker_id),
  ]

  const allExclude = [
    ...new Set([
      ...extraExclude,
      ...swipedIds,
      ...blockedIds,
      ...(filters.excludeInvisible ?? []),
      userId,
    ]),
  ]
  if (allExclude.length > 0) {
    query = query.not('id', 'in', `(${allExclude.join(',')})`)
  }

  if (filters.minAge) query = query.gte('age', filters.minAge)
  if (filters.maxAge) query = query.lte('age', filters.maxAge)
  if (filters.lookingFor) query = query.eq('looking_for', filters.lookingFor)
  if (filters.interestedIn?.length) query = query.in('gender', filters.interestedIn)
  if (filters.gender) query = query.contains('interested_in', [filters.gender])

  if (filters.lat && filters.lng && filters.maxDistance) {
    const latDelta = filters.maxDistance / 111
    const lngDelta = filters.maxDistance / (111 * Math.cos(filters.lat * Math.PI / 180))
    query = query
      .gte('latitude', filters.lat - latDelta)
      .lte('latitude', filters.lat + latDelta)
      .gte('longitude', filters.lng - lngDelta)
      .lte('longitude', filters.lng + lngDelta)
  }

  if (filters.city) query = query.ilike('location', `${filters.city}%`)

  query = query.limit(200)

  const { data: profiles, count } = await query
  if (!profiles || profiles.length === 0) {
    return { profiles: [], total: 0, page, explanations: {} }
  }

  // 2. Batch spark score via RPC unique (élimine le N+1)
  const targetIds = profiles.map((p: { id: string }) => p.id)

  let scored: Array<{ id: string; score: number; explanation: string }> = []
  try {
    const { data: batchScores } = await db.rpc('batch_spark_score', {
      p_user_id: userId,
      p_target_ids: targetIds,
    })
    if (batchScores) {
      scored = batchScores.map((s: { target_id: string; score: number; explanation: string }) => ({
        id: s.target_id,
        score: Number(s.score) || 0,
        explanation: s.explanation ?? '',
      }))
    }
  } catch {
    // Fallback: score uniforme si le RPC échoue
    scored = targetIds.map((id: string) => ({ id, score: 0.5, explanation: '' }))
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
registerEngine('recommendation', recommendationEngine)
