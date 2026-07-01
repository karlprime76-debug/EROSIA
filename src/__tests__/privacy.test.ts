import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })),
      insert: vi.fn(),
      update: vi.fn(),
    })),
  },
}))

import {
  canSendFirstMessage,
  canViewStory,
  canSeeOnlineStatus,
  shouldShowReadReceipt,
  getVisibleAge,
  getVisibleDistance,
  DEFAULT_PRIVACY,
  type PrivacySettings,
} from '@/lib/privacy'

const baseSettings: PrivacySettings = { ...DEFAULT_PRIVACY }

describe('canSendFirstMessage', () => {
  it('returns true for everyone permission', () => {
    expect(canSendFirstMessage('a', false, false, { ...baseSettings, first_message_permission: 'everyone' })).toBe(true)
  })

  it('returns true for matches when isMatch is true', () => {
    expect(canSendFirstMessage('a', true, false, { ...baseSettings, first_message_permission: 'matches' })).toBe(true)
  })

  it('returns false for matches when isMatch is false', () => {
    expect(canSendFirstMessage('a', false, false, { ...baseSettings, first_message_permission: 'matches' })).toBe(false)
  })

  it('returns true for verified_only when isVerified is true', () => {
    expect(canSendFirstMessage('a', false, true, { ...baseSettings, first_message_permission: 'verified_only' })).toBe(true)
  })

  it('returns false for verified_only when isVerified is false', () => {
    expect(canSendFirstMessage('a', false, false, { ...baseSettings, first_message_permission: 'verified_only' })).toBe(false)
  })

  it('returns false for nobody', () => {
    expect(canSendFirstMessage('a', true, true, { ...baseSettings, first_message_permission: 'nobody' })).toBe(false)
  })
})

describe('canViewStory', () => {
  it('returns true for everyone', () => {
    expect(canViewStory('a', false, { ...baseSettings, story_visibility: 'everyone' })).toBe(true)
  })

  it('returns true for matches when isMatch is true', () => {
    expect(canViewStory('a', true, { ...baseSettings, story_visibility: 'matches' })).toBe(true)
  })

  it('returns false for matches when isMatch is false', () => {
    expect(canViewStory('a', false, { ...baseSettings, story_visibility: 'matches' })).toBe(false)
  })

  it('returns false for nobody', () => {
    expect(canViewStory('a', true, { ...baseSettings, story_visibility: 'nobody' })).toBe(false)
  })
})

describe('canSeeOnlineStatus', () => {
  it('returns true for everyone', () => {
    expect(canSeeOnlineStatus('a', false, { ...baseSettings, online_status_visibility: 'everyone' })).toBe(true)
  })

  it('returns true for matches when isMatch is true', () => {
    expect(canSeeOnlineStatus('a', true, { ...baseSettings, online_status_visibility: 'matches' })).toBe(true)
  })

  it('returns false for nobody', () => {
    expect(canSeeOnlineStatus('a', false, { ...baseSettings, online_status_visibility: 'nobody' })).toBe(false)
  })
})

describe('shouldShowReadReceipt', () => {
  it('returns true when read_receipts is true', () => {
    expect(shouldShowReadReceipt({ ...baseSettings, read_receipts: true })).toBe(true)
  })

  it('returns false when read_receipts is false', () => {
    expect(shouldShowReadReceipt({ ...baseSettings, read_receipts: false })).toBe(false)
  })
})

describe('getVisibleAge', () => {
  it('returns dash for null age', () => {
    expect(getVisibleAge(null, baseSettings)).toBe('—')
  })

  it('returns exact age when hide_exact_age is false', () => {
    expect(getVisibleAge(25, { ...baseSettings, hide_exact_age: false })).toBe('25')
  })

  it('returns age bucket when hide_exact_age is true', () => {
    expect(getVisibleAge(27, { ...baseSettings, hide_exact_age: true })).toBe('25-29')
  })

  it('returns correct bucket for boundary ages', () => {
    expect(getVisibleAge(30, { ...baseSettings, hide_exact_age: true })).toBe('30-34')
    expect(getVisibleAge(24, { ...baseSettings, hide_exact_age: true })).toBe('20-24')
  })
})

describe('getVisibleDistance', () => {
  it('returns exact distance when hide_exact_distance is false', () => {
    expect(getVisibleDistance(15, { ...baseSettings, hide_exact_distance: false })).toBe('15 km')
  })

  it('returns friendly label when hide_exact_distance is true', () => {
    expect(getVisibleDistance(3, { ...baseSettings, hide_exact_distance: true })).toBe('À proximité')
    expect(getVisibleDistance(10, { ...baseSettings, hide_exact_distance: true })).toBe('Proche')
    expect(getVisibleDistance(30, { ...baseSettings, hide_exact_distance: true })).toBe('Dans le coin')
    expect(getVisibleDistance(99, { ...baseSettings, hide_exact_distance: true })).toBe('Un peu plus loin')
  })
})
