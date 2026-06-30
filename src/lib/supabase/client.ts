import { createBrowserClient } from '@supabase/ssr'

function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Variable d'environnement manquante: ${name}`)
  return val
}

export function createClient() {
  return createBrowserClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    { isSingleton: true }
  )
}

export const supabase = createClient()
