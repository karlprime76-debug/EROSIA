import type { DayNightState } from '../types'

export interface LightConfig {
  ambientIntensity: number
  directionalIntensity: number
  hemisphereColor: string
  hemisphereGround: string
  shadowMapSize: number
}

export function computeLighting(state: DayNightState, isMobile = false): LightConfig {
  return {
    ambientIntensity: state.ambientIntensity * 0.5,
    directionalIntensity: state.directionalIntensity * 0.8,
    hemisphereColor: state.hemisphereColor,
    hemisphereGround: '#1a1a2e',
    shadowMapSize: isMobile ? 512 : 2048,
  }
}

export function getSunPosition(state: DayNightState): { x: number; y: number; z: number } {
  const radius = 200
  const x = radius * Math.cos(state.sunAzimuth)
  const y = radius * state.sunAltitude
  const z = radius * Math.sin(state.sunAzimuth)
  return { x, y: Math.max(y, -50), z }
}
