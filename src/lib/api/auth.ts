import { supabase as sbClient } from '../supabase/client'

function supabase() {
  return sbClient
}

export async function signOut() {
  const { error } = await supabase().auth.signOut()
  return { error: error?.message ?? null }
}

export async function resetPassword(email: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
  const { error } = await supabase().auth.resetPasswordForEmail(email, { redirectTo: `${origin}/reset-password` })
  return { error: error?.message ?? null }
}
