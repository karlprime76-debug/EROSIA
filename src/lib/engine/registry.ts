import type { ScoringEngine } from './types'

const engines = new Map<string, ScoringEngine<unknown, unknown>>()

export function registerEngine<TIn, TOut>(
  name: string,
  engine: ScoringEngine<TIn, TOut>,
): void {
  engines.set(name, engine)
}

export function getEngine<TIn, TOut>(name: string): ScoringEngine<TIn, TOut> | undefined {
  return engines.get(name) as ScoringEngine<TIn, TOut> | undefined
}

export function getAllEngines(): Map<string, ScoringEngine<unknown, unknown>> {
  return new Map(engines)
}
