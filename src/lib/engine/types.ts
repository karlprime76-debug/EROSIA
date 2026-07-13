// Loose type for Supabase clients (browser/server/admin variants differ).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseClientLike = any

export interface ScoringEngine<TInput, TOutput> {
  name: string
  version: number
  compute(input: TInput, db?: SupabaseClientLike): Promise<TOutput>
}


export interface CompatInput {
  userId: string
  targetId: string
}

export interface CompatOutput {
  score: number
  factors: Record<string, number>
}

export interface BehaviorInput {
  userId: string
}

export interface BehaviorOutput {
  score: number
  signals: Record<string, number>
}

export interface RecommendInput {
  userId: string
  excludeIds: string[]
  filters?: RecommendFilters
  page?: number
  limit?: number
}

export interface RecommendFilters {
  minAge?: number
  maxAge?: number
  lookingFor?: string
  maxDistance?: number
  lat?: number
  lng?: number
  city?: string
  excludeInvisible?: string[]
  gender?: string
  interestedIn?: string[]
}

export interface RecommendOutput {
  profiles: string[]
  total: number
  page: number
  explanations: Record<string, string>
}

export interface ConversationInput {
  userId: string
}

export interface ConversationOutput {
  score: number
  metrics: Record<string, number>
}

export interface TrustInput {
  userId: string
}

export interface TrustOutput {
  score: number
  flags: string[]
}

export interface ActivityInput {
  userId: string
}

export interface ActivityOutput {
  score: number
}

export interface InterestGraphInput {
  userId: string
  targetId: string
}

export interface InterestGraphOutput {
  shared: number
  related: number
  boost: number
  details: string[]
}

export interface SparkInput {
  userId: string
  targetId: string
}

export interface SparkOutput {
  score: number
  explanation: string
  factors: Record<string, number>
}

export type BehaviorAction =
  | 'view_profile' | 'swipe_like' | 'swipe_pass' | 'swipe_super_like'
  | 'send_message' | 'open_message' | 'reply_message'
  | 'view_story' | 'send_flirt' | 'send_gift' | 'start_call'
  | 'unmatch' | 'block' | 'report' | 'visit_chat'
  | 'complete_quiz' | 'update_profile' | 'update_photo'
