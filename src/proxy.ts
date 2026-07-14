import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const kvUrl = process.env.KV_URL ?? process.env.UPSTASH_REDIS_REST_URL
const kvToken = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN

const fallbackRateMap = new Map<string, { count: number; resetAt: number }>()

async function checkRateLimit(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
  if (kvUrl && kvToken) {
    const { Ratelimit } = await import('@upstash/ratelimit')
    const { Redis } = await import('@upstash/redis')
    const redis = new Redis({ url: kvUrl, token: kvToken })
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs}ms`),
      analytics: true,
      prefix: 'erosia',
    })
    const { success } = await ratelimit.limit(key)
    return success
  }
  // Fallback en mémoire si KV pas configuré (dev)
  const now = Date.now()
  const entry = fallbackRateMap.get(key)
  if (!entry || now > entry.resetAt) {
    fallbackRateMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= maxRequests) return false
  entry.count++
  return true
}

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, ''),
  'https://erosia.app',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
].filter((s): s is string => Boolean(s))

function isKnownHost(request: NextRequest): boolean {
  const host = request.headers.get('host') ?? ''
  if (!host) return false
  const siteHost = process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host
    : null
  const known = [
    siteHost,
    'erosia.app',
    'erosia-app.vercel.app',
    'erosia-alpha.vercel.app',
  ].filter(Boolean) as string[]
  return known.some(k => host === k)
}

function originMatchesHost(originHeader: string | null, request: NextRequest): boolean {
  if (!originHeader) return isKnownHost(request)
  try {
    const originUrl = new URL(originHeader)
    const host = request.headers.get('host') ?? ''
    return originUrl.host === host || originUrl.host === host.replace(/:\d+$/, '')
  } catch {
    return false
  }
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'
}

const publicPaths = ['/welcome', '/login', '/register', '/forgot-password', '/reset-password', '/auth/callback']

export default async function proxy(request: NextRequest) {
  const { pathname, origin } = new URL(request.url)
  const method = request.method
  const ip = getClientIp(request)
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

  // ── CSRF Protection ──
  // Protect mutating API requests against cross-site attacks
  if (pathname.startsWith('/api/') && isMutation && pathname !== '/api/paydunya/webhook' && pathname !== '/api/paydunya/payout-callback' && pathname !== '/api/verify/webhook') {
    const originHeader = request.headers.get('origin')
    const referer = request.headers.get('referer')
    const allowed = ALLOWED_ORIGINS.some(ao =>
      originHeader === ao || referer?.startsWith(ao)
    ) || originMatchesHost(originHeader, request)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Origine non autorisée' },
        { status: 403 }
      )
    }
  }

  let supabaseResponse = NextResponse.next({ request })
  const secure = process.env.NODE_ENV === 'production'

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              secure,
              sameSite: 'lax',
              httpOnly: true,
            })
          )
        },
      },
    }
  )

  // ── Rate Limiting (in-memory — acceptable for serverless with cold-start reset) ──
  const routeKey = `${ip}:${pathname}`
  if (pathname.startsWith('/api/')) {
    let maxReqs = 30
    if (pathname === '/api/auth/register') maxReqs = 10
    else if (pathname === '/api/auth/delete-account') maxReqs = 5
    else if (pathname === '/auth/callback') maxReqs = 10
    else if (pathname === '/api/delete-match') maxReqs = 5
    else if (pathname.includes('/paydunya/')) maxReqs = 10

    if (pathname.startsWith('/api/auth/')) maxReqs = Math.min(maxReqs, 10)

    if (!await checkRateLimit(routeKey, maxReqs, 60_000)) {
      return NextResponse.json(
        { error: 'Trop de requêtes, réessaie dans une minute' },
        { status: 429 }
      )
    }
  }

  let user = null
  const result = await supabase.auth.getUser()
  user = result.data?.user ?? null

  if (!pathname.startsWith('/api/') && !pathname.startsWith('/_next/') && pathname !== '/sw.js' && pathname !== '/maintenance') {
    try {
      const { data: maintenance } = await supabase
        .from('maintenance_mode')
        .select('active')
        .limit(1)
        .maybeSingle()
      if (maintenance?.active) {
        if (!user) {
          return NextResponse.redirect(new URL('/maintenance', origin))
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle()
        if (!profile?.is_admin) {
          return NextResponse.redirect(new URL('/maintenance', origin))
        }
      }
    } catch {
    }
  }

  if (!pathname.startsWith('/api/') && !pathname.startsWith('/_next/') && pathname !== '/sw.js') {
    const isPublic = publicPaths.some(p => pathname.startsWith(p)) || pathname === '/'
      || pathname.startsWith('/privacy') || pathname.startsWith('/cgu')
      || pathname.startsWith('/delete-data') || pathname === '/offline'
      || pathname === '/maintenance' || pathname === '/status'

    if (!user && !isPublic && !pathname.startsWith('/onboarding')) return NextResponse.redirect(new URL('/welcome', origin))
    if (user && isPublic && pathname !== '/' && !pathname.startsWith('/onboarding') && pathname !== '/maintenance' && pathname !== '/status') return NextResponse.redirect(new URL('/discover', origin))
  }

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.google.com https://www.gstatic.com https://vercel.live",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.paydunya.com https://api.didit.me https://*.vercel.app https://raw.githubusercontent.com https://vercel.live wss://*.vercel.live",
    "frame-src 'self' https://challenges.cloudflare.com https://www.google.com https://vercel.live https://verification.didit.me https://*.didit.me",
    "frame-ancestors 'self'",
    "media-src 'self' https:",
    "object-src 'none'",
    "worker-src 'self' blob:",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  supabaseResponse.headers.set('Content-Security-Policy', csp)

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
