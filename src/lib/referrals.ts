import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

export interface Referral {
  id: string
  referrer_id: string
  referred_email?: string
  referred_id?: string
  status: 'invited' | 'joined' | 'rewarded'
  reward_granted: boolean
  created_at: string
}

export async function getReferralCode(): Promise<string | null> {
  const supabase = createBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.from('profiles').select('referral_code').eq('id', user.id).maybeSingle()
  if (data?.referral_code) return data.referral_code

  const code = await generateCode(supabase)
  if (!code) return null

  await supabase.from('profiles').update({ referral_code: code }).eq('id', user.id)
  return code
}

async function generateCode(supabase: ReturnType<typeof createBrowserClient>): Promise<string | null> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = ''
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
    const { data } = await supabase.from('profiles').select('id').eq('referral_code', code).maybeSingle()
    if (!data) return code
  }
  return null
}

export async function getReferralStats(): Promise<{ total: number; joined: number; canRedeem: boolean; rewarded: boolean }> {
  const supabase = createBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { total: 0, joined: 0, canRedeem: false, rewarded: false }

  const { data: referrals } = await supabase
    .from('referrals')
    .select('status, reward_granted')
    .eq('referrer_id', user.id)

  const total = referrals?.length ?? 0
  const joined = referrals?.filter(r => r.status === 'joined' && !r.reward_granted).length ?? 0
  const rewarded = referrals?.some(r => r.reward_granted) ?? false

  return { total, joined, canRedeem: joined >= 5, rewarded }
}

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
