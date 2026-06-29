export type StoryPrivacy = 'public' | 'close_friends'

export interface Story {
  id: string
  user_id: string
  media_url: string
  type: 'image' | 'video'
  privacy: StoryPrivacy
  compression_quality?: number
  created_at: string
  expires_at: string
  profile?: {
    id: string
    name: string
    photos: string[]
    is_verified: boolean
  }
  view_count?: number
  reaction_count?: number
  viewer_reacted?: boolean
}

export interface StoryView {
  id: string
  story_id: string
  user_id: string
  created_at: string
  profile?: {
    name: string
    photos: string[]
    is_verified: boolean
  }
}

export interface StoryReaction {
  id: string
  story_id: string
  user_id: string
  emoji: string
  created_at: string
  profile?: {
    name: string
    photos: string[]
  }
}

export interface StoryGroup {
  userId: string
  name: string
  photo: string
  isVerified: boolean
  stories: Story[]
  allViewed: boolean
}

export interface UploadStoryInput {
  file: File
  privacy?: StoryPrivacy
  onProgress?: (pct: number) => void
}

export interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
}
