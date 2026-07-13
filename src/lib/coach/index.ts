import { analyze as rulesAnalyze } from './providers/rules'
import type { CoachResult, CoachProvider, ProfileInput, Suggestion, SuggestionType, SuggestionSeverity } from './types'

export type { CoachResult, CoachProvider, ProfileInput, Suggestion, SuggestionType, SuggestionSeverity }

const provider: CoachProvider = { analyze: rulesAnalyze }

export async function analyzeProfile(input: ProfileInput): Promise<CoachResult> {
  return provider.analyze(input)
}
