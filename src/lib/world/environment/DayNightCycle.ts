import type { DayPhase, DayNightState } from '../types'

export function getPhase(timeOfDay: number): DayPhase {
  if (timeOfDay >= 5 && timeOfDay < 7) return 'dawn'
  if (timeOfDay >= 7 && timeOfDay < 12) return 'morning'
  if (timeOfDay >= 12 && timeOfDay < 17) return 'noon'
  if (timeOfDay >= 17 && timeOfDay < 19) return 'dusk'
  return 'night'
}

export function computeDayNightState(timeOfDay: number): DayNightState {
  const phase = getPhase(timeOfDay)
  const sunAngle = ((timeOfDay - 6) / 24) * Math.PI * 2
  const sunAltitude = Math.sin(sunAngle)
  const sunAzimuth = sunAngle

  const ambientMap: Record<DayPhase, number> = {
    dawn: 0.3, morning: 0.6, noon: 1.0, dusk: 0.4, night: 0.1,
  }
  const dirMap: Record<DayPhase, number> = {
    dawn: 0.4, morning: 0.8, noon: 1.2, dusk: 0.5, night: 0.05,
  }
  const colorMap: Record<DayPhase, string> = {
    dawn: '#FF9966', morning: '#87CEEB', noon: '#FFFFFF', dusk: '#FF6B35', night: '#0A0A2E',
  }
  const fogColorMap: Record<DayPhase, string> = {
    dawn: '#FFDDBB', morning: '#E8F0F8', noon: '#F0F4F8', dusk: '#FFCCAA', night: '#0A0A1A',
  }
  const fogDensityMap: Record<DayPhase, number> = {
    dawn: 0.015, morning: 0.005, noon: 0.002, dusk: 0.02, night: 0.03,
  }

  return {
    phase,
    timeOfDay,
    sunAltitude: Math.max(0, sunAltitude),
    sunAzimuth,
    ambientIntensity: ambientMap[phase],
    directionalIntensity: dirMap[phase],
    hemisphereColor: colorMap[phase],
    fogColor: fogColorMap[phase],
    fogDensity: fogDensityMap[phase],
  }
}

export function advanceTime(state: DayNightState, deltaHours: number): DayNightState {
  const newTime = (state.timeOfDay + deltaHours) % 24
  return computeDayNightState(newTime)
}
