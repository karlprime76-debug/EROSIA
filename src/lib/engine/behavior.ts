import { supabase as browserClient } from '@/lib/supabase/client'
import type { ScoringEngine, BehaviorInput, BehaviorOutput, SupabaseClientLike } from './types'
import { registerEngine } from './registry'

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

export class BehaviorEngine implements ScoringEngine<BehaviorInput, BehaviorOutput> {
  name = 'behavior'
  version = 1

  async compute(input: BehaviorInput, db?: SupabaseClientLike): Promise<BehaviorOutput> {
    return computeBehavior(input.userId, db ?? browserClient)
  }
}

async function computeBehavior(userId: string, db: SupabaseClientLike): Promise<BehaviorOutput> {
  const signals: Record<string, number> = {}

  // Ratio like/pass sur 7 jours
  const recent = await db
    .from('behavior_log')
    .select('action')
    .eq('user_id', userId)
    .in('action', ['swipe_like', 'swipe_pass', 'swipe_super_like'])
    .gte('created_at', new Date(Date.now() - SEVEN_DAYS).toISOString())

  const actions = recent.data ?? []
  const likes = actions.filter((a: { action: string }) => a.action === 'swipe_like' || a.action === 'swipe_super_like').length
  const total = actions.length
  signals.likeRatio = total > 0 ? likes / total : 0.5

  // Profils consultés par jour
  const views = await db
    .from('behavior_log')
    .select('created_at')
    .eq('user_id', userId)
    .eq('action', 'view_profile')
    .gte('created_at', new Date(Date.now() - SEVEN_DAYS).toISOString())

  const daysActive = new Set((views.data ?? []).map((v: { created_at: string }) =>
    new Date(v.created_at).toISOString().slice(0, 10),
  )).size
  signals.profilesPerDay = daysActive > 0 ? (views.data?.length ?? 0) / daysActive : 0

  // Jours actifs par semaine
  const allActions7d = await db
    .from('behavior_log')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - SEVEN_DAYS).toISOString())

  const activeDays = new Set((allActions7d.data ?? []).map((a: { created_at: string }) =>
    new Date(a.created_at).toISOString().slice(0, 10),
  )).size
  signals.activeDaysPerWeek = activeDays / 7

  // Taux de réponse aux messages sur 30 jours
  const msgs = await db
    .from('behavior_log')
    .select('action')
    .eq('user_id', userId)
    .in('action', ['send_message', 'reply_message'])
    .gte('created_at', new Date(Date.now() - THIRTY_DAYS).toISOString())

  const sent = (msgs.data ?? []).filter((a: Record<string, string>) => a.action === 'send_message').length
  const replied = (msgs.data ?? []).filter((a: Record<string, string>) => a.action === 'reply_message').length
  signals.replyRate = sent > 0 ? replied / sent : 0

  // Diversité des actions
  const distinctActions = new Set((allActions7d.data ?? []).map((a: Record<string, string>) => a.action)).size
  signals.actionDiversity = Math.min(distinctActions / 10, 1)

  // Score composite
  const score = Math.round((
    signals.likeRatio * 0.25 +
    Math.min(signals.profilesPerDay / 50, 1) * 0.15 +
    signals.activeDaysPerWeek * 0.20 +
    signals.replyRate * 0.25 +
    signals.actionDiversity * 0.15
  ) * 1000) / 1000

  return { score, signals }
}

export const behaviorEngine = new BehaviorEngine()
registerEngine('behavior', behaviorEngine)
