// UNGUARDED ENV: process.env.NEXT_PUBLIC_SUPABASE_URL! (l.5), NEXT_PUBLIC_SUPABASE_ANON_KEY! (l.6)
// Ces vars sont vérifiées au build — ajouter un guard: if (!url) throw new Error('...')
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { isSingleton: true }
  )
}

export const supabase = createClient()
