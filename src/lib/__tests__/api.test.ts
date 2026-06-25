import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    auth: { getUser: vi.fn(), signOut: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  }
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

import { signOut, createSwipe, sendMessage } from '../api'

describe('signOut', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.auth.signOut.mockResolvedValue({ error: null })
  })

  it('calls supabase signOut', async () => {
    const result = await signOut()
    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    expect(result.error).toBeNull()
  })
})

describe('createSwipe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user1' } } })
    mockSupabase.from.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'swipe1', swiper_id: 'user1', swiped_id: 'user2', direction: 'like' }, error: null }),
        })),
      })),
    })
  })

  it('creates a swipe with direction like', async () => {
    const result = await createSwipe('user2', 'like')
    expect(result.data).toBeDefined()
    expect(result.data?.direction).toBe('like')
  })

  it('returns error if not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await createSwipe('user2', 'like')
    expect(result.error).toBe('Not authenticated')
  })
})

describe('sendMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user1' } } })
    mockSupabase.from.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'msg1', match_id: 'match1', sender_id: 'user1', text: 'Hello' }, error: null }),
        })),
      })),
    })
  })

  it('sends a text message', async () => {
    const result = await sendMessage('match1', 'Hello')
    expect(result.data).toBeDefined()
    expect(result.data?.text).toBe('Hello')
  })
})
