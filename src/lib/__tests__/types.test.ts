import { describe, it, expect } from 'vitest'
import type { Profile, Swipe, Match, Message, ProfileFilters } from '../api/types'

describe('Types are exported correctly', () => {
  it('Profile type has required fields', () => {
    const p: Profile = { id: '1', name: 'Test', age: null, bio: null, occupation: null, location: null, photos: [], interests: [], is_verified: false, looking_for: 'serious', created_at: '', incognito: false, ghost_mode: false, super_likes_remaining: 0, super_likes_reset_at: '' }
    expect(p.id).toBe('1')
    expect(p.name).toBe('Test')
  })

  it('Swipe type has required fields', () => {
    const s: Swipe = { id: '1', swiper_id: 'u1', swiped_id: 'u2', direction: 'like', created_at: '' }
    expect(s.direction).toBe('like')
  })

  it('Match type has required fields', () => {
    const m: Match = { id: '1', user1_id: 'u1', user2_id: 'u2', created_at: '' }
    expect(m.user1_id).toBe('u1')
  })

  it('Message type has required fields', () => {
    const m: Message = { id: '1', match_id: 'm1', sender_id: 'u1', text: 'hello', image_url: null, view_once: false, deleted_for_all: false, created_at: '' }
    expect(m.text).toBe('hello')
  })

  it('ProfileFilters is usable', () => {
    const f: ProfileFilters = { minAge: 18, maxAge: 35, lookingFor: 'serious' }
    expect(f.minAge).toBe(18)
  })
})
