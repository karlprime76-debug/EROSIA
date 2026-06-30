const messageCache = new Map<string, { messages: Record<string, unknown>[]; timestamp: number }>()
const CACHE_TTL = 30_000

export function getCachedMessages(matchId: string) {
  const entry = messageCache.get(matchId)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.messages
  return null
}

export function setCachedMessages(matchId: string, messages: Record<string, unknown>[]) {
  messageCache.set(matchId, { messages, timestamp: Date.now() })
}

export function clearCache(matchId?: string) {
  if (matchId) messageCache.delete(matchId)
  else messageCache.clear()
}
