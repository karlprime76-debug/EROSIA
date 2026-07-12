export type LookingFor = 'friendship' | 'casual' | 'fwb' | 'serious' | 'open'
export type Mood = 'discuter' | 'rencontre' | 'disponible_ce_soir' | 'relation_serieuse' | 'chill' | 'de_passage'
export type Gender = 'male' | 'female' | 'non_binary'

export interface Profile {
  id: string
  name: string
  age: number | null
  bio: string | null
  occupation: string | null
  location: string | null
  photos: string[]
  interests: string[]
  is_verified: boolean
  verification_status?: string | null
  verified_at?: string | null
  looking_for: LookingFor
  created_at: string
  last_seen?: string
  incognito: boolean
  ghost_mode: boolean
  last_active_at?: string
  latitude?: number
  longitude?: number
  super_likes_remaining: number
  super_likes_reset_at: string
  travel_city?: string
  travel_active?: boolean
  subscription_tier?: 'free' | 'premium'
  premium_expires_at?: string
  video_url?: string | null
  mood?: Mood
  energy_score?: number
  trust_score?: number
  profile_visible?: boolean
  is_admin?: boolean
  gender?: Gender
  interested_in?: string[]
}

export interface Swipe {
  id: string
  swiper_id: string
  swiped_id: string
  direction: 'like' | 'pass' | 'super_like'
  created_at: string
}

export interface Match {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  ephemeral?: boolean
  read_count?: number
}

export interface Message {
  id: string
  match_id: string
  sender_id: string
  text: string | null
  image_url: string | null
  audio_url?: string
  video_url?: string
  gif_url?: string
  reply_to?: string
  reply_preview?: { text: string | null; sender_id: string } | null
  view_once: boolean
  expires_at?: string
  read_at?: string
  edited_at?: string
  deleted_for_all: boolean
  created_at: string
}

export interface BlockedProfile {
  blocked_id: string
  created_at: string
  blocked: { name: string; photos: string[] } | null
}

export interface ProfileFilters { minAge?: number; maxAge?: number; lookingFor?: string; showIncognito?: boolean; gender?: Gender; interestedIn?: string[] }

export interface GiftTransaction {
  id: string
  user_id: string
  type: 'gift_received' | 'payout'
  amount_cents: number
  sent_gift_id: string | null
  payment_details: string | null
  status: 'completed' | 'pending' | 'failed' | 'cancelled'
  created_at: string
  updated_at: string
}
