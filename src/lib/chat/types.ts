export interface ChatMessage {
  id: string
  match_id: string
  sender_id: string
  text: string | null
  image_url: string | null
  audio_url: string | null
  video_url: string | null
  gif_url: string | null
  reply_to: string | null
  reply_preview: { text: string | null; sender_id: string } | null
  view_once: boolean
  expires_at: string | null
  read_at: string | null
  edited_at: string | null
  deleted_for_all: boolean
  created_at: string
}

export interface Conversation {
  matchId: string
  profile: ChatProfile
  lastMessage: ChatMessage | null
  unreadCount: number
  isTyping: boolean
  isRecording: boolean
  isFavorite: boolean
  isArchived: boolean
  isBlocked: boolean
}

export interface ChatProfile {
  id: string
  name: string
  age: number | null
  photos: string[]
  mood: string | null
  trust_score: number
  energy_score: number
  is_online: boolean
  last_seen: string | null
}

export interface Reaction {
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface VoiceRecordingState {
  isRecording: boolean
  duration: number
  blob: Blob | null
  url: string | null
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

export type ChatFilter = 'all' | 'unread' | 'favorites' | 'archived'
