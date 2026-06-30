import { registerCriterion } from './registry'
import { communicationCriterion } from './criteria/communication'
import { valuesCriterion } from './criteria/values'
import { interestsCriterion } from './criteria/interests'
import { lifestyleCriterion } from './criteria/lifestyle'
import { availabilityCriterion } from './criteria/availability'
import { goalsCriterion } from './criteria/goals'

const criteria = [
  communicationCriterion,
  valuesCriterion,
  interestsCriterion,
  lifestyleCriterion,
  availabilityCriterion,
  goalsCriterion,
]

let registered = false

export function ensureCriteriaRegistered() {
  if (registered) return
  for (const c of criteria) registerCriterion(c)
  registered = true
}
