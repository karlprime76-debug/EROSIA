export interface CriterionResult {
  score: number
  strengths: string[]
  differences: string[]
  tips: string[]
}

export interface CriterionDefinition {
  id: string
  label: string
  icon: string
  weight: number
  description: string
  calculate(userA: ProfileSnapshot, userB: ProfileSnapshot): Promise<CriterionResult>
}

export interface ProfileSnapshot {
  id: string
  name: string
  age: number | null
  bio: string | null
  occupation: string | null
  location: string | null
  interests: string[]
  mood: string | null
  looking_for: string | null
  energy_score: number | null
  traits: string[]
  has_quiz: boolean
}

export interface CompatibilityReport {
  matchId: string
  userId: string
  targetId: string
  targetName: string
  targetPhoto: string | null
  globalScore: number
  criteria: CriterionResultWithMeta[]
  topStrengths: string[]
  keyDifferences: string[]
  advice: string[]
  generatedAt: string
}

export interface CriterionResultWithMeta extends CriterionResult {
  id: string
  label: string
  icon: string
  weight: number
  description: string
}

export interface DateSuggestion {
  type: string
  budget: string
  distance: string
  description: string
}
