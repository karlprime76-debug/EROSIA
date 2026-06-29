import type { MobileConfig, PerformanceStats } from '../types'

export function detectMobile(): boolean {
  if (typeof window === 'undefined') return false
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
}

export function getMobileConfig(userAgent?: string): MobileConfig {
  const isMobile = userAgent
    ? /Mobi|Android|iPhone|iPad/i.test(userAgent)
    : detectMobile()

  if (!isMobile) {
    return {
      pixelRatio: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1,
      shadowMapSize: 2048,
      maxLights: 8,
      disablePostProcessing: false,
      disableShadows: false,
      textureQuality: 'high',
    }
  }

  return {
    pixelRatio: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 1.5) : 1,
    shadowMapSize: 512,
    maxLights: 4,
    disablePostProcessing: true,
    disableShadows: true,
    textureQuality: 'medium',
  }
}

export function adaptPerformance(stats: PerformanceStats, config: MobileConfig): MobileConfig {
  if (stats.fps < 30 && config.textureQuality !== 'low') {
    return { ...config, textureQuality: 'low', shadowMapSize: 256, disablePostProcessing: true }
  }
  if (stats.fps < 20) {
    return { ...config, textureQuality: 'low', shadowMapSize: 0, disableShadows: true, disablePostProcessing: true, maxLights: 2 }
  }
  return config
}
