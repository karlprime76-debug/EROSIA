import type { CriterionDefinition } from './types'

const registry = new Map<string, CriterionDefinition>()

export function registerCriterion(criterion: CriterionDefinition) {
  registry.set(criterion.id, criterion)
}

export function getCriterion(id: string): CriterionDefinition | undefined {
  return registry.get(id)
}

export function getAllCriteria(): CriterionDefinition[] {
  return Array.from(registry.values())
}

export function resetCriteriaForTesting() {
  registry.clear()
}
