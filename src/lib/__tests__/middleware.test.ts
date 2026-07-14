import { describe, it, expect } from 'vitest'

describe('Middleware — helper functions', () => {
  it('should identify public paths correctly', () => {
    const publicPaths = ['/welcome', '/login', '/register', '/forgot-password', '/reset-password', '/auth/callback']
    const isPublic = (path: string) =>
      publicPaths.some(p => path.startsWith(p)) || path === '/'
      || path.startsWith('/privacy') || path.startsWith('/cgu')
      || path.startsWith('/delete-data') || path === '/offline'
      || path === '/maintenance' || path === '/status'

    expect(isPublic('/login')).toBe(true)
    expect(isPublic('/register')).toBe(true)
    expect(isPublic('/forgot-password')).toBe(true)
    expect(isPublic('/reset-password')).toBe(true)
    expect(isPublic('/auth/callback')).toBe(true)
    expect(isPublic('/privacy')).toBe(true)
    expect(isPublic('/cgu/')).toBe(true)
    expect(isPublic('/maintenance')).toBe(true)
    expect(isPublic('/')).toBe(true)
    expect(isPublic('/discover')).toBe(false)
    expect(isPublic('/chat/abc')).toBe(false)
    expect(isPublic('/settings')).toBe(false)
  })

  it('should detect mutating HTTP methods', () => {
    const isMutation = (method: string) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
    expect(isMutation('POST')).toBe(true)
    expect(isMutation('PUT')).toBe(true)
    expect(isMutation('PATCH')).toBe(true)
    expect(isMutation('DELETE')).toBe(true)
    expect(isMutation('GET')).toBe(false)
    expect(isMutation('HEAD')).toBe(false)
    expect(isMutation('OPTIONS')).toBe(false)
  })

  it('should extract client IP from headers', () => {
    const getClientIp = (headers: Record<string, string | null>): string =>
      headers['x-forwarded-for']?.split(',')[0]?.trim()
      ?? headers['x-real-ip']
      ?? 'unknown'

    expect(getClientIp({ 'x-forwarded-for': '1.2.3.4' })).toBe('1.2.3.4')
    expect(getClientIp({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })).toBe('1.2.3.4')
    expect(getClientIp({ 'x-real-ip': '9.10.11.12' })).toBe('9.10.11.12')
    expect(getClientIp({})).toBe('unknown')
    expect(getClientIp({ 'x-forwarded-for': '  ::1  ' })).toBe('::1')
  })

  it('should match known hosts', () => {
    const makeIsKnownHost = (siteUrl: string | undefined) => {
      return (host: string): boolean => {
        const siteHost = siteUrl ? new URL(siteUrl).host : null
        const known = [siteHost, 'erosia.app', 'erosia-app.vercel.app', 'erosia-alpha.vercel.app'].filter(Boolean) as string[]
        return known.some(k => host === k)
      }
    }

    const isKnownHost = makeIsKnownHost('https://erosia-app.vercel.app')
    expect(isKnownHost('erosia.app')).toBe(true)
    expect(isKnownHost('erosia-app.vercel.app')).toBe(true)
    expect(isKnownHost('erosia-alpha.vercel.app')).toBe(true)
    expect(isKnownHost('evil.com')).toBe(false)
    expect(isKnownHost('localhost:3000')).toBe(false)
  })

  it('should validate origin matches host', () => {
    const originMatchesHost = (originHeader: string | null, hostHeader: string): boolean => {
      if (!originHeader) return false
      try {
        const originUrl = new URL(originHeader)
        return originUrl.host === hostHeader || originUrl.host === hostHeader.replace(/:\d+$/, '')
      } catch { return false }
    }
    expect(originMatchesHost('https://erosia.app', 'erosia.app')).toBe(true)
    expect(originMatchesHost('https://erosia.app', 'erosia.app:3000')).toBe(true)
    expect(originMatchesHost('https://evil.com', 'erosia.app')).toBe(false)
    expect(originMatchesHost('not-a-url', 'erosia.app')).toBe(false)
    expect(originMatchesHost(null, 'erosia.app')).toBe(false)
  })
})

describe('Middleware — rate limiting fallback', () => {
  it('should allow requests within limit', async () => {
    const map = new Map<string, { count: number; resetAt: number }>()
    const now = Date.now()
    const checkRateLimit = async (key: string, maxRequests: number, windowMs: number): Promise<boolean> => {
      const entry = map.get(key)
      if (!entry || now > entry.resetAt) {
        map.set(key, { count: 1, resetAt: now + windowMs })
        return true
      }
      if (entry.count >= maxRequests) return false
      entry.count++
      return true
    }
    expect(await checkRateLimit('test-key', 3, 60_000)).toBe(true)
    expect(await checkRateLimit('test-key', 3, 60_000)).toBe(true)
    expect(await checkRateLimit('test-key', 3, 60_000)).toBe(true)
    expect(await checkRateLimit('test-key', 3, 60_000)).toBe(false)
  })

  it('should reset after window expires', async () => {
    const map = new Map<string, { count: number; resetAt: number }>()
    const checkRateLimit = async (key: string, maxRequests: number, windowMs: number): Promise<boolean> => {
      const now = Date.now()
      const entry = map.get(key)
      if (!entry || now > entry.resetAt) {
        map.set(key, { count: 1, resetAt: now + windowMs })
        return true
      }
      if (entry.count >= maxRequests) return false
      entry.count++
      return true
    }
    const past = Date.now() - 10_000
    map.set('stale', { count: 5, resetAt: past })
    expect(await checkRateLimit('stale', 3, 60_000)).toBe(true)
  })

  it('should use separate counters per key', async () => {
    const map = new Map<string, { count: number; resetAt: number }>()
    const now = Date.now()
    const checkRateLimit = async (key: string, maxRequests: number, windowMs: number): Promise<boolean> => {
      const entry = map.get(key)
      if (!entry || now > entry.resetAt) {
        map.set(key, { count: 1, resetAt: now + windowMs })
        return true
      }
      if (entry.count >= maxRequests) return false
      entry.count++
      return true
    }
    map.set('key-a', { count: 5, resetAt: now + 60_000 })
    expect(await checkRateLimit('key-a', 5, 60_000)).toBe(false)
    expect(await checkRateLimit('key-b', 5, 60_000)).toBe(true)
  })
})
