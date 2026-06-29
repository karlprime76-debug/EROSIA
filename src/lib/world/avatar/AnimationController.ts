import type { AvatarAnimation } from '../types'

export const ANIMATION_TRANSITIONS: Record<AvatarAnimation, AvatarAnimation[]> = {
  idle: ['standing', 'walking', 'waving', 'sitting', 'dancing', 'turning'],
  standing: ['idle', 'walking'],
  walking: ['idle', 'running', 'turning'],
  running: ['idle', 'walking'],
  sitting: ['idle', 'standing', 'waving'],
  waving: ['idle', 'dancing'],
  dancing: ['idle', 'waving'],
  turning: ['idle', 'walking'],
  floating: ['idle', 'waving'],
}

export function canTransition(from: AvatarAnimation, to: AvatarAnimation): boolean {
  if (from === to) return true
  return ANIMATION_TRANSITIONS[from]?.includes(to) ?? false
}

export function getCrossfadeDuration(from: AvatarAnimation, to: AvatarAnimation): number {
  if (from === to) return 0
  if (from === 'idle') return 0.2
  if (to === 'idle') return 0.3
  return 0.15
}

export const ANIMATION_SPEEDS: Record<AvatarAnimation, number> = {
  idle: 1,
  standing: 1,
  walking: 1.2,
  running: 1.8,
  sitting: 0.8,
  waving: 1.5,
  dancing: 1.0,
  turning: 1.0,
  floating: 0.6,
}

export const ANIMATION_LOOPS: Record<AvatarAnimation, boolean> = {
  idle: true,
  standing: true,
  walking: true,
  running: true,
  sitting: true,
  waving: false,
  dancing: true,
  turning: false,
  floating: true,
}
