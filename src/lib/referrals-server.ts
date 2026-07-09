import { createClient as createServerClient } from '@/lib/supabase/server'

export async function applyReferralCode(code: string): Promise<{ error?: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data, error } = await supabase.rpc('apply_referral_code', {
    p_code: code,
    p_user_id: user.id,
  })

  if (error) return { error: "Erreur lors de l'application du code" }
  if (data?.error) return { error: data.error }

  return {}
}

export async function redeemReferralReward(): Promise<{ error?: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data, error } = await supabase.rpc('redeem_referral_reward', {
    p_user_id: user.id,
  })

  if (error) return { error: "Erreur lors du déblocage de la récompense" }
  if (data?.error) return { error: data.error }

  return {}
}
