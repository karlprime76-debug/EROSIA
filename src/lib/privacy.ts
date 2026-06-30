import { supabase } from '@/lib/supabase/client'

export type FirstMessagePermission = 'everyone' | 'matches' | 'verified_only' | 'nobody'
export type StoryVisibility = 'everyone' | 'matches' | 'nobody'
export type OnlineStatusVisibility = 'everyone' | 'matches' | 'nobody'

export interface PrivacySettings {
  profile_visible: boolean
  visible_to_compatible_only: boolean
  hide_exact_age: boolean
  hide_exact_distance: boolean
  blur_photos: boolean
  first_message_permission: FirstMessagePermission
  story_visibility: StoryVisibility
  online_status_visibility: OnlineStatusVisibility
  read_receipts: boolean
  auto_block_reported: boolean
}

export const DEFAULT_PRIVACY: PrivacySettings = {
  profile_visible: true,
  visible_to_compatible_only: false,
  hide_exact_age: false,
  hide_exact_distance: false,
  blur_photos: false,
  first_message_permission: 'everyone',
  story_visibility: 'everyone',
  online_status_visibility: 'everyone',
  read_receipts: true,
  auto_block_reported: false,
}

export async function getPrivacySettings(): Promise<{ data: PrivacySettings | null; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Non authentifié' }
  const { data, error } = await supabase.from('privacy_settings').select('*').eq('user_id', user.id).maybeSingle()
  if (error) return { data: null, error: error.message }
  if (data) return { data: data as PrivacySettings }
  const { error: insError } = await supabase.from('privacy_settings').insert({ user_id: user.id })
  if (insError) return { data: null, error: insError.message }
  return { data: DEFAULT_PRIVACY }
}

export async function getTargetPrivacy(userId: string): Promise<{ data: PrivacySettings | null; error?: string }> {
  const { data, error } = await supabase.from('privacy_settings').select('*').eq('user_id', userId).maybeSingle()
  if (error) return { data: null, error: error.message }
  if (!data) return { data: DEFAULT_PRIVACY }
  return { data: data as PrivacySettings }
}

export async function updatePrivacySettings(updates: Partial<PrivacySettings>): Promise<{ error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  const { error } = await supabase.from('privacy_settings').update(updates).eq('user_id', user.id)
  if (error) return { error: error.message }
  return {}
}

export function getVisibleAge(age: number | null, settings: PrivacySettings): string {
  if (!age) return '—'
  if (settings.hide_exact_age) {
    const bucket = Math.floor(age / 5) * 5
    return `${bucket}-${bucket + 4}`
  }
  return String(age)
}

export function getVisibleDistance(km: number, settings: PrivacySettings): string {
  if (settings.hide_exact_distance) {
    if (km < 5) return 'À proximité'
    if (km < 20) return 'Proche'
    if (km < 50) return 'Dans le coin'
    return 'Un peu plus loin'
  }
  return `${km} km`
}

export function canSendFirstMessage(
  senderId: string,
  isMatch: boolean,
  isVerified: boolean,
  targetSettings: PrivacySettings,
): boolean {
  switch (targetSettings.first_message_permission) {
    case 'everyone': return true
    case 'matches': return isMatch
    case 'verified_only': return isVerified
    case 'nobody': return false
  }
}

export function canViewStory(
  viewerId: string,
  isMatch: boolean,
  targetSettings: PrivacySettings,
): boolean {
  switch (targetSettings.story_visibility) {
    case 'everyone': return true
    case 'matches': return isMatch
    case 'nobody': return false
  }
}

export function canSeeOnlineStatus(
  viewerId: string,
  isMatch: boolean,
  targetSettings: PrivacySettings,
): boolean {
  switch (targetSettings.online_status_visibility) {
    case 'everyone': return true
    case 'matches': return isMatch
    case 'nobody': return false
  }
}

export function shouldShowReadReceipt(targetSettings: PrivacySettings): boolean {
  return targetSettings.read_receipts
}
