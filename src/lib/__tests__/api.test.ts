import { describe, it, expect, vi, beforeEach } from 'vitest'

function makeChain() {
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    in: vi.fn(() => chain),
    or: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    count: 0,
  }
  return chain
}

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    auth: { getUser: vi.fn(), signOut: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  }
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
  supabase: mockSupabase,
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
    const chain = makeChain()
    chain.count = 0
    chain.maybeSingle.mockResolvedValue({ data: { subscription_tier: 'free' }, error: null })
    chain.single
      .mockResolvedValueOnce({ data: { id: 'swipe1', swiper_id: 'user1', swiped_id: 'user2', direction: 'like' }, error: null })
    mockSupabase.from.mockReturnValue(chain)
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
    const chain = makeChain()
    chain.maybeSingle
      .mockResolvedValueOnce({ data: { user1_id: 'user1', user2_id: 'user2' }, error: null })
    chain.single.mockResolvedValue({ data: { id: 'msg1', match_id: 'match1', sender_id: 'user1', text: 'Hello' }, error: null })
    mockSupabase.from.mockReturnValue(chain)
  })

  it('sends a text message', async () => {
    const result = await sendMessage('match1', 'Hello')
    expect(result.data).toBeDefined()
    expect(result.data?.text).toBe('Hello')
  })
})
