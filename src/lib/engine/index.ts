export { getEngine } from './registry'
export type { ScoringEngine } from './types'
export type {
  CompatInput, CompatOutput,
  RecommendInput, RecommendOutput, RecommendFilters,
  BehaviorInput, BehaviorOutput,
  ConversationInput, ConversationOutput,
  TrustInput, TrustOutput,
  ActivityInput, ActivityOutput,
  InterestGraphInput, InterestGraphOutput,
  SparkInput, SparkOutput,
  BehaviorAction,
} from './types'

export { energyScoreEngine } from './energy-score'
export type { EnergyInput, EnergyOutput } from './energy-score'

import './compatibility'
import './behavior'
import './conversation'
import './trust'
import './activity'
import './interest-graph'
import './spark-score'
import './recommendation'
import './energy-score'
