import { createClient as createServerClient } from '@/lib/supabase/server'

export async function applyReferralCode(code: string): Promise<{ error?: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: referrer } = await supabase.from('profiles').select('id').eq('referral_code', code).maybeSingle()
  if (!referrer) return { error: 'Code invalide' }
  if (referrer.id === user.id) return { error: 'Tu ne peux pas te parrainer toi-même' }

  const { error } = await supabase.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: user.id,
    status: 'joined',
  })
  if (error) return { error: "Erreur lors de l'application du code" }

  return {}
}

export async function redeemReferralReward(): Promise<{ error?: string }> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { count } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', user.id)
    .eq('status', 'joined')
    .eq('reward_granted', false)

  if (!count || count < 5) return { error: '5 filleuls requis' }

  const { data: profile } = await supabase.from('profiles').select('subscription_tier, premium_expires_at').eq('id', user.id).maybeSingle()

  const now = new Date()
  const currentExpiry = profile?.premium_expires_at ? new Date(profile.premium_expires_at) : now
  const newExpiry = new Date(Math.max(currentExpiry.getTime(), now.getTime()) + 30 * 24 * 60 * 60 * 1000)

  await supabase.from('profiles').update({
    subscription_tier: 'premium',
    premium_expires_at: newExpiry.toISOString(),
  }).eq('id', user.id)

  await supabase.from('referrals').update({ reward_granted: true }).eq('referrer_id', user.id).eq('status', 'joined').eq('reward_granted', false)

  return {}
}
