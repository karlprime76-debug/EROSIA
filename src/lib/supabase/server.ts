// UNGUARDED ENV: process.env.NEXT_PUBLIC_SUPABASE_URL! (l.8), NEXT_PUBLIC_SUPABASE_ANON_KEY! (l.9)
// Ces vars sont vérifiées au build — ajouter un guard: if (!url) throw new Error('...')
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // ignore — can be called during static generation
          }
        },
      },
    }
  )
}
