import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    auth: { getUser: vi.fn(), signOut: vi.fn(), resetPasswordForEmail: vi.fn() },
  }
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
  supabase: mockSupabase,
}))

import { getCurrentUserId, signOut, resetPassword } from '../api'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getCurrentUserId', () => {
  it('returns user id when authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user1' } } })
    const result = await getCurrentUserId()
    expect(result).toBe('user1')
  })

  it('returns null when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await getCurrentUserId()
    expect(result).toBeNull()
  })
})

describe('signOut', () => {
  it('calls supabase signOut', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null })
    const result = await signOut()
    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    expect(result.error).toBeNull()
  })

  it('returns error on failure', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: { message: 'Network error' } })
    const result = await signOut()
    expect(result.error).toBe('Network error')
  })
})

describe('resetPassword', () => {
  it('calls resetPasswordForEmail', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    const result = await resetPassword('test@example.com')
    expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.objectContaining({ redirectTo: expect.stringContaining('/reset-password') })
    )
    expect(result.error).toBeNull()
  })
})
