import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const rateMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= maxRequests) return false
  entry.count++
  return true
}

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL,
  'https://erosia-jet.vercel.app',
  'http://localhost:3000',
].filter(Boolean) as string[]

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'
}

const publicPaths = ['/welcome', '/login', '/register', '/forgot-password', '/reset-password', '/auth/callback', '/onboarding']

export async function proxy(request: NextRequest) {
  const { pathname, origin } = new URL(request.url)
  const method = request.method
  const ip = getClientIp(request)
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

  // ── CSRF Protection ──
  // Protect mutating API requests against cross-site attacks
  if (pathname.startsWith('/api/') && isMutation && !pathname.startsWith('/api/paydunya/')) {
    const originHeader = request.headers.get('origin')
    const referer = request.headers.get('referer')
    const allowed = ALLOWED_ORIGINS.some(ao =>
      originHeader === ao || referer?.startsWith(ao)
    )
    if (!allowed) {
      return NextResponse.json(
        { error: 'Origine non autorisée' },
        { status: 403 }
      )
    }
  }

  // ── Rate Limiting ──
  const routeKey = `${ip}:${pathname}`
  if (pathname.startsWith('/api/')) {
    let maxReqs = 30
    if (pathname === '/api/auth/register') maxReqs = 3
    else if (pathname === '/api/auth/delete-account') maxReqs = 5
    else if (pathname === '/api/auth/callback') maxReqs = 10
    else if (pathname.includes('/paydunya/')) maxReqs = 10

    if (pathname.startsWith('/api/auth/')) maxReqs = Math.min(maxReqs, 10)

    if (!checkRateLimit(routeKey, maxReqs, 60_000)) {
      return NextResponse.json(
        { error: 'Trop de requêtes, réessaie dans une minute' },
        { status: 429 }
      )
    }
  }

  // ── Session refresh + auth redirect ──
  let supabaseResponse = NextResponse.next({ request })

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
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Skip auth redirect for API, static files, and public pages
  if (!pathname.startsWith('/api/') && !pathname.startsWith('/_next/')) {
    const isPublic = publicPaths.some(p => pathname.startsWith(p)) || pathname === '/'
      || pathname.startsWith('/privacy') || pathname.startsWith('/cgu')
      || pathname.startsWith('/delete-data') || pathname === '/offline'

    if (!user && !isPublic) return NextResponse.redirect(new URL('/welcome', origin))
    if (user && isPublic && pathname !== '/') return NextResponse.redirect(new URL('/discover', origin))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
