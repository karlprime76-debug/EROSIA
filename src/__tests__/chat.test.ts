import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getCachedMessages, setCachedMessages, clearCache } from '@/lib/chat/cache'
import { formatMessageTime, formatLastSeen, truncateMessage, groupMessagesByDate, getDayLabel } from '@/lib/chat/utils'

// ─────────── Cache tests ───────────
describe('chat cache', () => {
  beforeEach(() => clearCache())
  afterEach(() => clearCache())

  it('returns null for uncached match', () => {
    expect(getCachedMessages('match-1')).toBeNull()
  })

  it('returns cached messages within TTL', () => {
    const messages = [{ id: '1', text: 'hello' }]
    setCachedMessages('match-1', messages)
    expect(getCachedMessages('match-1')).toEqual(messages)
  })

  it('clears single entry', () => {
    setCachedMessages('match-1', [{ id: '1' }])
    setCachedMessages('match-2', [{ id: '2' }])
    clearCache('match-1')
    expect(getCachedMessages('match-1')).toBeNull()
    expect(getCachedMessages('match-2')).not.toBeNull()
  })

  it('clears all entries', () => {
    setCachedMessages('match-1', [{ id: '1' }])
    setCachedMessages('match-2', [{ id: '2' }])
    clearCache()
    expect(getCachedMessages('match-1')).toBeNull()
    expect(getCachedMessages('match-2')).toBeNull()
  })
})

// ─────────── Utils tests ───────────
describe('truncateMessage', () => {
  it('returns empty string for null/undefined', () => {
    expect(truncateMessage(null)).toBe('')
    expect(truncateMessage(undefined)).toBe('')
  })

  it('returns text unchanged when under max', () => {
    expect(truncateMessage('hello')).toBe('hello')
  })

  it('truncates and adds ellipsis when over max', () => {
    const long = 'a'.repeat(100)
    expect(truncateMessage(long, 10)).toBe('aaaaaaaaaa…')
  })
})

describe('groupMessagesByDate', () => {
  it('groups messages by date', () => {
    const messages = [
      { created_at: '2025-01-01T10:00:00Z' },
      { created_at: '2025-01-01T12:00:00Z' },
      { created_at: '2025-01-02T08:00:00Z' },
    ]
    const groups = groupMessagesByDate(messages)
    expect(groups).toHaveLength(2)
    expect(groups[0].messages).toHaveLength(2)
    expect(groups[1].messages).toHaveLength(1)
  })

  it('returns empty array for empty input', () => {
    expect(groupMessagesByDate([])).toEqual([])
  })
})

describe('getDayLabel', () => {
  it('returns Aujourd\'hui for today', () => {
    const today = new Date().toISOString()
    expect(getDayLabel(today)).toBe("Aujourd'hui")
  })

  it('returns Hier for yesterday', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    expect(getDayLabel(yesterday)).toBe('Hier')
  })
})
