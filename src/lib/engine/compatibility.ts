import { supabase } from '@/lib/supabase/client'
import type { ScoringEngine, CompatInput, CompatOutput } from './types'
import { registerEngine } from './registry'

export class CompatibilityEngine implements ScoringEngine<CompatInput, CompatOutput> {
  name = 'compatibility'
  version = 1

  async compute(input: CompatInput): Promise<CompatOutput> {
    const { score, factors } = await computeCompat(input.userId, input.targetId)
    return { score, factors }
  }
}

async function computeCompat(userId: string, targetId: string): Promise<{ score: number; factors: Record<string, number> }> {
  const [user, target] = await Promise.all([
    supabase.from('profiles').select('age, latitude, longitude, looking_for, interests, lang, created_at').eq('id', userId).maybeSingle(),
    supabase.from('profiles').select('age, latitude, longitude, looking_for, interests, lang, created_at').eq('id', targetId).maybeSingle(),
  ])
  if (!user.data || !target.data) return { score: 0, factors: {} }

  const factors: Record<string, number> = {}
  let totalWeight = 0
  let weightedSum = 0

  // Âge (15%)
  if (user.data.age && target.data.age) {
    const ageDiff = Math.abs(user.data.age - target.data.age)
    factors.age = Math.max(0, 1 - ageDiff / 50)
    weightedSum += factors.age * 0.15; totalWeight += 0.15
  }

  // Distance (20%)
  if (user.data.latitude && user.data.longitude && target.data.latitude && target.data.longitude) {
    const dist = haversine(
      user.data.latitude, user.data.longitude,
      target.data.latitude, target.data.longitude,
    )
    factors.distance = Math.max(0, 1 - Math.min(dist, 500) / 500)
    weightedSum += factors.distance * 0.20; totalWeight += 0.20
  }

  // Intérêts (25%)
  const userInterests: string[] = user.data.interests ?? []
  const targetInterests: string[] = target.data.interests ?? []
  if (userInterests.length > 0 && targetInterests.length > 0) {
    const targetLower = targetInterests.map(t => t.toLowerCase())
    const intersection = userInterests.filter(i => targetLower.includes(i.toLowerCase()))
    const union = new Set([...userInterests, ...targetInterests])
    factors.interests = intersection.length / union.size
    weightedSum += factors.interests * 0.25; totalWeight += 0.25
  }

  // Objectif relationnel (15%)
  if (user.data.looking_for && target.data.looking_for) {
    if (user.data.looking_for === target.data.looking_for) {
      factors.lookingFor = 1.0
    } else {
      const compatMap: Record<string, string[]> = {
        serious: ['fwb', 'open'], fwb: ['serious', 'casual', 'open'],
        casual: ['fwb', 'open'], open: ['serious', 'fwb', 'casual'],
        friendship: ['casual', 'open'],
      }
      factors.lookingFor = (compatMap[user.data.looking_for] ?? []).includes(target.data.looking_for) ? 0.5 : 0
    }
    weightedSum += factors.lookingFor * 0.15; totalWeight += 0.15
  }

  // Langue (5%)
  const uLang = user.data.lang ?? 'fr'
  const tLang = target.data.lang ?? 'fr'
  factors.language = uLang === tLang ? 1.0 : 0.3
  weightedSum += factors.language * 0.05; totalWeight += 0.05

  // Personnalité via quiz (15%)
  const traits = await Promise.all([
    supabase.rpc('get_user_top_traits', { p_user_id: userId }),
    supabase.rpc('get_user_top_traits', { p_user_id: targetId }),
  ])
  const userTraits = (traits[0].data as { trait: string }[] | null) ?? []
  const targetTraits = (traits[1].data as { trait: string }[] | null) ?? []
  if (userTraits.length > 0 && targetTraits.length > 0) {
    const shared = userTraits.filter(t => targetTraits.some((tt: { trait: string }) => tt.trait === t.trait)).length
    const max = Math.max(userTraits.length, targetTraits.length)
    factors.personality = max > 0 ? shared / max : 0
    weightedSum += factors.personality * 0.15; totalWeight += 0.15
  }

  // Activité (5%) — bonus si les deux sont actifs récemment
  const [uScore, tScore] = await Promise.all([
    supabase.from('user_scores').select('activity_score').eq('user_id', userId).maybeSingle(),
    supabase.from('user_scores').select('activity_score').eq('user_id', targetId).maybeSingle(),
  ])
  const uAct = uScore.data?.activity_score ?? 1
  const tAct = tScore.data?.activity_score ?? 1
  factors.activityBonus = Math.min(uAct, tAct)
  weightedSum += factors.activityBonus * 0.05; totalWeight += 0.05

  const finalScore = totalWeight > 0 ? weightedSum / totalWeight : 0
  return { score: Math.round(finalScore * 1000) / 1000, factors }
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const compatibilityEngine = new CompatibilityEngine()
registerEngine('compatibility', compatibilityEngine)
