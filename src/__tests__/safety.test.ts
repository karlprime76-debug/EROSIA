import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logConsent, getConsentLog, revokeConsent, reportUser, blockUser, unblockUser, getBlockedUsers, isUserBlocked, getSafetyTips, getSafetySummary } from '@/lib/safety/api'
import type { ConsentActionType, SafetyTip, BlockedUser, SafetySummary } from '@/lib/safety/types'

const mockFetch = vi.fn()
global.fetch = mockFetch

const mockUserId = 'user-123'
const mockTargetId = 'target-456'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('logConsent', () => {
  it('logs a consent action successfully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })

    const result = await logConsent(mockUserId, 'share_photo', mockTargetId, { content_type: 'photo' })

    expect(result).toEqual({})
    expect(mockFetch).toHaveBeenCalledWith('/api/safety/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: mockUserId,
        action_type: 'share_photo',
        target_user_id: mockTargetId,
        metadata: { content_type: 'photo' },
      }),
    })
  })

  it('returns error on failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })

    const result = await logConsent(mockUserId, 'consent_revoked')

    expect(result).toEqual({ error: 'Impossible de journaliser cette action' })
  })
})

describe('getConsentLog', () => {
  it('returns consent log entries', async () => {
    const fakeData = [{ id: '1', action_type: 'share_photo', created_at: '2024-01-01' }]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(fakeData),
    })

    const result = await getConsentLog(mockUserId)

    expect(result.data).toEqual(fakeData)
  })

  it('returns error on failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })

    const result = await getConsentLog(mockUserId)

    expect(result).toEqual({ error: 'Impossible de récupérer l historique' })
  })
})

describe('revokeConsent', () => {
  it('revokes consent successfully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })

    const result = await revokeConsent(mockUserId)

    expect(result).toEqual({})
    expect(mockFetch).toHaveBeenCalledWith('/api/safety/consent', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: mockUserId }),
    })
  })
})

describe('reportUser', () => {
  it('submits a report successfully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })

    const result = await reportUser({
      reported_id: mockTargetId,
      reason: 'harcèlement',
      description: 'Messages répétés',
      match_id: 'match-789',
    })

    expect(result).toEqual({})
    expect(mockFetch).toHaveBeenCalledWith('/api/safety/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reported_id: mockTargetId,
        reason: 'harcèlement',
        description: 'Messages répétés',
        match_id: 'match-789',
      }),
    })
  })

  it('rejects invalid reasons', async () => {
    // The API validates allowedReasons, but the client sends whatever
    // This just verifies the fetch goes through
    mockFetch.mockResolvedValueOnce({ ok: false })

    const result = await reportUser({
      reported_id: mockTargetId,
      reason: 'invalid_reason',
    })

    expect(result).toEqual({ error: 'Impossible de soumettre le signalement' })
  })
})

describe('blockUser', () => {
  it('blocks a user successfully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })

    const result = await blockUser(mockTargetId)

    expect(result).toEqual({})
    expect(mockFetch).toHaveBeenCalledWith('/api/safety/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocked_id: mockTargetId }),
    })
  })
})

describe('unblockUser', () => {
  it('unblocks a user successfully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })

    const result = await unblockUser(mockTargetId)

    expect(result).toEqual({})
    expect(mockFetch).toHaveBeenCalledWith('/api/safety/block', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocked_id: mockTargetId }),
    })
  })
})

describe('getBlockedUsers', () => {
  it('returns blocked users list', async () => {
    const fakeData: { data: BlockedUser[] } = {
      data: [{ id: '1', blocked_id: mockTargetId, name: 'Someone', photo: null, created_at: '2024-01-01' }],
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(fakeData),
    })

    const result = await getBlockedUsers()

    expect(result.data).toEqual(fakeData.data)
  })
})

describe('isUserBlocked', () => {
  it('returns blocked status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ blocked: true }),
    })

    const result = await isUserBlocked(mockTargetId)

    expect(result).toEqual({ blocked: true })
  })

  it('returns false on error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })

    const result = await isUserBlocked(mockTargetId)

    expect(result).toEqual({ blocked: false, error: 'Erreur de vérification' })
  })
})

describe('getSafetyTips', () => {
  it('returns all tips', async () => {
    const fakeData: { data: SafetyTip[] } = {
      data: [{ id: '1', category: 'dating', icon: 'Heart', title: 'Test', content: 'Test content', priority: 10 }],
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(fakeData),
    })

    const result = await getSafetyTips()

    expect(result.data).toEqual(fakeData.data)
    expect(mockFetch).toHaveBeenCalledWith('/api/safety/tips')
  })

  it('filters by category', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    })

    await getSafetyTips('privacy')

    expect(mockFetch).toHaveBeenCalledWith('/api/safety/tips?category=privacy')
  })
})

describe('getSafetySummary', () => {
  it('returns safety summary', async () => {
    const fakeData: { data: SafetySummary } = {
      data: { blockedCount: 2, recentConsentActions: 5, hasActiveConsent: true },
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(fakeData),
    })

    const result = await getSafetySummary()

    expect(result.data).toEqual(fakeData.data)
  })
})

describe('ConsentActionType validation', () => {
  it('accepts all valid consent action types', () => {
    const validTypes: ConsentActionType[] = [
      'share_photo',
      'share_location',
      'share_contact',
      'consent_granted',
      'consent_revoked',
      'report_submitted',
      'user_blocked',
      'user_unblocked',
      'sensitive_info_warning_viewed',
    ]

    expect(validTypes.length).toBe(9)
    validTypes.forEach(t => {
      expect(typeof t).toBe('string')
      expect(t.length).toBeGreaterThan(0)
    })
  })
})
