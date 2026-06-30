import { supabase as browserClient } from '@/lib/supabase/client'
import type { ScoringEngine, InterestGraphInput, InterestGraphOutput, SupabaseClientLike } from './types'
import { registerEngine } from './registry'

const INTEREST_CATEGORIES: Record<string, string[]> = {
  voyage: ['voyage', 'voyager', 'tourisme', 'avion', 'découverte', 'roadtrip', 'voyages'],
  sport: ['sport', 'fitness', 'musculation', 'running', 'yoga', 'randonnée', 'vélo', 'natation', 'escalade', 'danse'],
  musique: ['musique', 'concert', 'festival', 'guitare', 'piano', 'chant', 'dj', 'hiphop', 'rap', 'jazz', 'rock'],
  culture: ['cinéma', 'lecture', 'livre', 'théâtre', 'musée', 'art', 'peinture', 'photographie', 'série', 'documentaire'],
  cuisine: ['cuisine', 'gastronomie', 'pâtisserie', 'restaurant', 'café', 'brunch', 'cocktail', 'vin'],
  nature: ['nature', 'plage', 'montagne', 'camping', 'jardinage', 'animal', 'chien', 'chat', 'écologie'],
  social: ['soirée', 'amis', 'famille', 'jeux', 'jeu_vidéo', 'boardgame', 'karaoké'],
  lifestyle: ['mode', 'beauté', 'bienêtre', 'méditation', 'développement_personnel', 'spiritualité'],
  tech: ['technologie', 'programmation', 'jeux_vidéo', 'esport', 'science', 'astronomie'],
  business: ['entrepreneuriat', 'startup', 'finance', 'investissement', 'marketing'],
}

const CATEGORY_RELATIONS: Record<string, string[]> = {
  voyage: ['nature', 'culture', 'cuisine'],
  sport: ['nature', 'lifestyle'],
  musique: ['culture', 'social'],
  culture: ['musique', 'voyage', 'cuisine'],
  cuisine: ['voyage', 'social', 'lifestyle'],
  nature: ['voyage', 'sport', 'lifestyle'],
  social: ['musique', 'cuisine', 'lifestyle'],
  lifestyle: ['sport', 'nature', 'social'],
  tech: ['business'],
  business: ['tech'],
}

const DEFAULT_CATEGORY = 'social'

function categorizeInterest(interest: string): { name: string; category: string } {
  const normalized = interest.toLowerCase().trim().replace(/[^a-z0-9_éèêëàâùûüôöîïç]/g, '')
  for (const [category, keywords] of Object.entries(INTEREST_CATEGORIES)) {
    if (keywords.includes(normalized)) return { name: normalized, category }
  }
  return { name: normalized, category: DEFAULT_CATEGORY }
}

export class InterestGraphEngine implements ScoringEngine<InterestGraphInput, InterestGraphOutput> {
  name = 'interest-graph'
  version = 1

  async compute(input: InterestGraphInput, db?: SupabaseClientLike): Promise<InterestGraphOutput> {
    return computeInterestBoost(input.userId, input.targetId, db ?? browserClient)
  }
}

async function ensureInterest(name: string, category: string, db: SupabaseClientLike): Promise<string | null> {
  const { data: existing } = await db
    .from('interest_graph')
    .select('id')
    .eq('name', name)
    .maybeSingle()
  if (existing) return existing.id

  const { data: inserted } = await db
    .from('interest_graph')
    .insert({ name, category })
    .select('id')
    .single()
  return inserted?.id ?? null
}

async function syncProfileInterests(profileId: string, interests: string[], db: SupabaseClientLike): Promise<void> {
  const mapped = interests.map(categorizeInterest)
  const interestIds: string[] = []
  for (const { name, category } of mapped) {
    const id = await ensureInterest(name, category, db)
    if (id) interestIds.push(id)
  }

  if (interestIds.length > 0) {
    const existing = await db
      .from('profile_interests')
      .select('interest_id')
      .eq('profile_id', profileId)
    const existingIds = new Set((existing.data ?? []).map((e: { interest_id: string }) => e.interest_id))
    const toInsert = interestIds.filter(id => !existingIds.has(id)).map(id => ({ profile_id: profileId, interest_id: id, level: 1 }))
    if (toInsert.length > 0) {
      await db.from('profile_interests').upsert(toInsert, { onConflict: 'profile_id, interest_id' })
    }
  }
}

async function computeInterestBoost(userId: string, targetId: string, db: SupabaseClientLike): Promise<InterestGraphOutput> {
  const [userProfile, targetProfile] = await Promise.all([
    db.from('profiles').select('interests').eq('id', userId).maybeSingle(),
    db.from('profiles').select('interests').eq('id', targetId).maybeSingle(),
  ])

  const userInterests: string[] = userProfile.data?.interests ?? []
  const targetInterests: string[] = targetProfile.data?.interests ?? []

  // Sync interests to graph
  await Promise.all([
    syncProfileInterests(userId, userInterests, db),
    syncProfileInterests(targetId, targetInterests, db),
  ])

  const details: string[] = []

  // Direct shared
  const shared = userInterests.filter(i => targetInterests.map(t => t.toLowerCase()).includes(i.toLowerCase()))
  if (shared.length > 0) {
    details.push(`${shared.length} intérêt(s) en commun (${shared.join(', ')})`)
  }

  // Graph-based: find related interests via category matching
  const userCats = new Set(userInterests.map(i => categorizeInterest(i).category))
  const targetCats = new Set(targetInterests.map(i => categorizeInterest(i).category))

  let related = 0
  for (const uCat of userCats) {
    const relCats = CATEGORY_RELATIONS[uCat] ?? []
    for (const tCat of targetCats) {
      if (relCats.includes(tCat) && uCat !== tCat) related++
    }
  }

  if (related > 0) {
    details.push(`${related} catégorie(s) complémentaire(s)`)
  }

  // Boost = shared / max + related * 0.3
  const maxInterests = Math.max(userInterests.length, targetInterests.length, 1)
  const boost = (shared.length / maxInterests * 0.7) + (Math.min(related, 5) / 5 * 0.3)

  return {
    shared: shared.length,
    related,
    boost: Math.round(boost * 100) / 100,
    details,
  }
}

export const interestGraphEngine = new InterestGraphEngine()
registerEngine('interest-graph', interestGraphEngine)
