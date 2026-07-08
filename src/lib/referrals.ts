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
