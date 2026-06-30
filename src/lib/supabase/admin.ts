import { createClient } from '@supabase/supabase-js'

function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Variable d'environnement manquante: ${name}`)
  return val
}

export function createAdminClient() {
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_KEY'),
    { auth: { persistSession: false } }
  )
}
