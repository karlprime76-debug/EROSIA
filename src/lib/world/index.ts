// ──────────────────────────────────────────────
// Erosia Island — World Engine
// Module indépendant — aucun impact sur les autres modules
// ──────────────────────────────────────────────

export * from './types'

export * from './engine'
export * from './world'
export * from './avatar'
export * from './camera'
export * from './environment'
export * from './audio'
export * from './physics'
export * from './networking'
export * from './npc'
export * from './streaming'
export * from './mobile'

// ── Constants ─────────────────────────────────

export const WORLD_NAME = 'Erosia Island'
export const WORLD_VERSION = '1.0.0'
export const WORLD_DESCRIPTION = 'Monde virtuel social Erosia — 7 zones, avatars, cycle jour/nuit, météo dynamique'

export const DEFAULT_SPAWN = { x: 0, y: 0, z: 5 }
export const TICK_RATE = 20          // physics/network ticks per second
export const DAY_CYCLE_SPEED = 0.5    // real minutes per game hour
export const WEATHER_CHANGE_INTERVAL = 15 * 60 * 1000  // 15 min real time
