// UNGUARDED ENV: process.env.NEXT_PUBLIC_SUPABASE_URL! (l.5), SUPABASE_SERVICE_KEY! (l.6)
// SUPABASE_SERVICE_KEY est critique — ajouter un guard: if (!key) throw new Error('...')
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
  )
}
