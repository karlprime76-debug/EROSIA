import { createClient } from '@supabase/supabase-js'

function requireEnv(val: string | undefined, name: string): string {
  if (!val) throw new Error(`Variable d'environnement manquante: ${name}`)
  return val
}

export function createAdminClient() {
  return createClient(
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv(process.env.SUPABASE_SERVICE_KEY, 'SUPABASE_SERVICE_KEY'),
    { auth: { persistSession: false } }
  )
}
