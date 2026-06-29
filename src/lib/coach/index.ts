import { analyze as rulesAnalyze } from './providers/rules'
import type { CoachResult, CoachProvider, ProfileInput, Suggestion, SuggestionType, SuggestionSeverity } from './types'

export type { CoachResult, CoachProvider, ProfileInput, Suggestion, SuggestionType, SuggestionSeverity }

let provider: CoachProvider = { analyze: rulesAnalyze }

export function setCoachProvider(p: CoachProvider) {
  provider = p
}

export function getCoachProvider(): CoachProvider {
  return provider
}

export async function analyzeProfile(input: ProfileInput): Promise<CoachResult> {
  return provider.analyze(input)
}
