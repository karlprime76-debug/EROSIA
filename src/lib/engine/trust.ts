import { supabase as browserClient } from '@/lib/supabase/client'
import type { ScoringEngine, TrustInput, TrustOutput, SupabaseClientLike } from './types'
import { registerEngine } from './registry'

export class TrustEngine implements ScoringEngine<TrustInput, TrustOutput> {
  name = 'trust'
  version = 2

  async compute(input: TrustInput, db?: SupabaseClientLike): Promise<TrustOutput> {
    return computeTrust(input.userId, db ?? browserClient)
  }
}

async function computeTrust(userId: string, db: SupabaseClientLike): Promise<TrustOutput> {
  const flags: string[] = []

  const { data: profile } = await db
    .from('profiles')
    .select('is_verified, created_at, photos, bio, interests, onboarding_complete, subscription_tier, last_active_at')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) return { score: 0, flags: ['profil_introuvable'] }

  let score = 50

  // KYC / Vérification identité (±15)
  if (profile.is_verified) {
    score += 15
  } else {
    score -= 5
    flags.push('non_verifié')
  }

  // Ancienneté du compte (0-12)
  const accountAge = Date.now() - new Date(profile.created_at).getTime()
  const ageDays = accountAge / (1000 * 60 * 60 * 24)
  score += Math.min(Math.floor(ageDays / 30) * 2, 10)
  if (ageDays >= 90) score += 2
  if (ageDays < 1) flags.push('nouveau_compte')

  // Abonnement premium (+5)
  if (profile.subscription_tier === 'premium') {
    score += 5
  }

  // Qualité du profil (-10 à +10)
  let quality = 0
  const photoCount = (profile.photos ?? []).length
  if (photoCount >= 3) quality += 2
  else if (photoCount >= 1) quality += 1
  else quality -= 2

  if (profile.bio && profile.bio.trim().length > 20) quality += 2
  else if (profile.bio && profile.bio.trim().length > 0) quality += 1
  else quality -= 1

  const interestCount = (profile.interests ?? []).length
  if (interestCount >= 3) quality += 2
  else if (interestCount >= 1) quality += 1
  else quality -= 1

  if (profile.onboarding_complete) quality += 1
  else quality -= 1
  score += quality * 2.5

  if (quality < 0) flags.push('profil_incomplet')

  // Comportement : ratio like/pass, jours actifs, diversité (0-15)
  const sevenDays = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDays = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: recentActions } = await db
    .from('behavior_log')
    .select('action, created_at')
    .eq('user_id', userId)
    .in('action', ['swipe_like', 'swipe_pass', 'swipe_super_like'])
    .gte('created_at', sevenDays)

  const actions = recentActions ?? []
  const likes = actions.filter((a: { action: string }) => a.action === 'swipe_like' || a.action === 'swipe_super_like').length
  const total = actions.length
  const likeRatio = total > 0 ? likes / total : 0.5

  const { data: allActions } = await db
    .from('behavior_log')
    .select('action, created_at')
    .eq('user_id', userId)
    .gte('created_at', sevenDays)

  const activeDays = new Set((allActions ?? []).map((a: { created_at: string }) => new Date(a.created_at).toISOString().slice(0, 10))).size
  const activeDaysPerWeek = activeDays / 7

  const distinctActions = new Set((allActions ?? []).map((a: { action: string }) => a.action)).size
  const actionDiversity = Math.min(distinctActions / 10, 1)

  const behaviorScore = likeRatio * 5 + activeDaysPerWeek * 5 + actionDiversity * 5
  score += behaviorScore

  // Comportement anormal : spam detection
  if (total > 20 && likeRatio < 0.2) {
    score -= 10
    flags.push('comportement_anormal')
  }

  // Taux de réponse aux messages (0-5)
  const { data: msgActions } = await db
    .from('behavior_log')
    .select('action')
    .eq('user_id', userId)
    .in('action', ['send_message', 'reply_message'])
    .gte('created_at', thirtyDays)

  const sent = (msgActions ?? []).filter((a: { action: string }) => a.action === 'send_message').length
  const replied = (msgActions ?? []).filter((a: { action: string }) => a.action === 'reply_message').length
  const replyRate = sent > 0 ? replied / sent : 0
  score += replyRate * 5

  // Signalements (pénalité -30 max)
  const { count: reportCount } = await db
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('reported_id', userId)
  const reports = reportCount ?? 0
  score -= Math.min(reports * 10, 30)
  if (reports > 0) flags.push(`signalé_${reports}_fois`)

  // Inactivité récente
  const lastSeen = profile.last_active_at ? new Date(profile.last_active_at).getTime() : 0
  const daysSinceActive = lastSeen > 0 ? (Date.now() - lastSeen) / (1000 * 60 * 60 * 24) : 99
  if (daysSinceActive > 90) {
    score -= 10; flags.push('inactif_+90j')
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
