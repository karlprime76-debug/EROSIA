import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

function requireEnv(val: string | undefined, name: string): string {
  if (!val) throw new Error(`Variable d'environnement manquante: ${name}`)
  return val
}

export async function createClient() {
  const cookieStore = await cookies()

  const secure = process.env.NODE_ENV === 'production'

  return createServerClient(
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, secure, sameSite: 'lax' })
            )
          } catch {
            // ignore — can be called during static generation
          }
        },
      },
    }
  )
}
