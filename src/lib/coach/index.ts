import { analyze as openAiAnalyze } from './providers/openai'
import type { CoachResult, CoachProvider, ProfileInput, Suggestion, SuggestionType, SuggestionSeverity } from './types'

export type { CoachResult, CoachProvider, ProfileInput, Suggestion, SuggestionType, SuggestionSeverity }

const provider: CoachProvider = { analyze: openAiAnalyze }

export async function analyzeProfile(input: ProfileInput): Promise<CoachResult> {
  return provider.analyze(input)
}
