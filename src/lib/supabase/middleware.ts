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

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  const routeKey = `${ip}:${pathname}`
  if (pathname.startsWith('/api/')) {
    let maxReqs = 30
    if (pathname === '/api/auth/register') maxReqs = 3
    else if (pathname.includes('/paydunya/')) maxReqs = 10
    if (!checkRateLimit(routeKey, maxReqs, 60_000)) {
      return new NextResponse(JSON.stringify({ error: 'Trop de requêtes, réessaie dans une minute' }), {
        status: 429, headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
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

  await supabase.auth.getUser()
  return supabaseResponse
}
