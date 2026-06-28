import { supabase } from '@/lib/supabase/client'
import type { ScoringEngine, ConversationInput, ConversationOutput } from './types'
import { registerEngine } from './registry'

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

export class ConversationEngine implements ScoringEngine<ConversationInput, ConversationOutput> {
  name = 'conversation'
  version = 1

  async compute(input: ConversationInput): Promise<ConversationOutput> {
    return computeConversation(input.userId)
  }
}

async function computeConversation(userId: string): Promise<ConversationOutput> {
  const metrics: Record<string, number> = {}

  // Messages envoyés et reçus sur 30 jours
  const since = new Date(Date.now() - THIRTY_DAYS).toISOString()
  const { data: matches } = await supabase
    .from('matches')
    .select('id, created_at')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

  if (!matches || matches.length === 0) {
    return { score: 0, metrics: {} }
  }

  const matchIds = matches.map(m => m.id)

  const { data: messages } = await supabase
    .from('messages')
    .select('sender_id, match_id, created_at')
    .in('match_id', matchIds)
    .gte('created_at', since)
    .order('created_at', { ascending: true })

  const msgs = messages ?? []

  // Taux de réponse
  const sentByMe = msgs.filter(m => m.sender_id === userId).length
  const sentToMe = msgs.filter(m => m.sender_id !== userId).length
  metrics.responseRate = sentToMe > 0 ? Math.min(sentByMe / sentToMe, 1) : 0

  // Temps moyen de réponse
  const replyTimes: number[] = []
  for (const matchId of matchIds) {
    const matchMsgs = msgs.filter(m => m.match_id === matchId)
    for (let i = 1; i < matchMsgs.length; i++) {
      if (matchMsgs[i].sender_id !== matchMsgs[i - 1].sender_id) {
        replyTimes.push(
          new Date(matchMsgs[i].created_at).getTime() - new Date(matchMsgs[i - 1].created_at).getTime(),
        )
      }
    }
  }
  const avgReplyMs = replyTimes.length > 0
    ? replyTimes.reduce((a, b) => a + b, 0) / replyTimes.length
    : 0
  // 0-60min → 1.0, 60-240min → 0.5, >240min → 0.2
  metrics.avgResponseTime = avgReplyMs > 0
    ? avgReplyMs < 3600000 ? 1 : avgReplyMs < 14400000 ? 0.5 : 0.2
    : 0

  // Longueur moyenne des conversations (messages par match)
  const msgsPerMatch = matchIds.map(id => msgs.filter(m => m.match_id === id).length)
  const avgConversationLength = msgsPerMatch.reduce((a, b) => a + b, 0) / matches.length
  metrics.avgConversationLength = Math.min(avgConversationLength / 20, 1)

  // Taux de ghosting (matches sans message après 48h)
  const ghostedMatches = matches.filter(m => {
    const matchMsgs = msgs.filter(msg => msg.match_id === m.id)
    if (matchMsgs.length === 0) return true
    const lastMsgTime = new Date(matchMsgs[matchMsgs.length - 1].created_at).getTime()
    if (isNaN(lastMsgTime)) return true
    return Date.now() - lastMsgTime > 48 * 60 * 60 * 1000
  })
  metrics.ghostingRate = matches.length > 0 ? ghostedMatches.length / matches.length : 0

  // Score composite
  const score = Math.round((
    metrics.responseRate * 0.30 +
    metrics.avgResponseTime * 0.20 +
    metrics.avgConversationLength * 0.15 +
    (1 - metrics.ghostingRate) * 0.35
  ) * 1000) / 1000

  return { score, metrics }
}

export const conversationEngine = new ConversationEngine()
registerEngine('conversation', conversationEngine)
