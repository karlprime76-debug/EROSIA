export type SuggestionType = 'photo' | 'bio' | 'interests' | 'general'
export type SuggestionSeverity = 'tip' | 'warning' | 'info'

export interface ProfileInput {
  name?: string
  bio?: string | null
  photos?: string[]
  interests?: string[]
  occupation?: string | null
  location?: string | null
  age?: number | null
  is_verified?: boolean
  video_url?: string | null
  mood?: string | null
  looking_for?: string | null
  energy_score?: number | null
}

export interface Suggestion {
  type: SuggestionType
  severity: SuggestionSeverity
  title: string
  description: string
  field?: string
}

export interface CoachResult {
  score: number
  summary: string
  suggestions: Suggestion[]
  strengths: string[]
}

export interface CoachProvider {
  analyze(p: ProfileInput): Promise<CoachResult>
}
