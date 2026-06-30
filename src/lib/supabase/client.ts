import { createBrowserClient } from '@supabase/ssr'

function requireEnv(val: string | undefined, name: string): string {
  if (!val) throw new Error(`Variable d'environnement manquante: ${name}`)
  return val
}

export function createClient() {
  return createBrowserClient(
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    { isSingleton: true }
  )
}

export const supabase = createClient()
