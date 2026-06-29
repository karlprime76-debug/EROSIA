import type { MobileConfig, PerformanceStats } from '../types'

export interface RendererConfig {
  canvas: HTMLCanvasElement | null
  width: number
  height: number
  pixelRatio: number
  antialias: boolean
  shadows: boolean
  toneMapping: 'ACESFilmic' | 'Reinhard' | 'Neutral'
  outputColorSpace: 'srgb' | 'linear'
}

export function getDefaultRendererConfig(mobile?: MobileConfig): RendererConfig {
  return {
    canvas: null,
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
    pixelRatio: mobile?.pixelRatio ?? Math.min(window.devicePixelRatio, 2),
    antialias: true,
    shadows: !mobile?.disableShadows,
    toneMapping: 'ACESFilmic',
    outputColorSpace: 'srgb',
  }
}

export function createRendererConfig(
  canvas: HTMLCanvasElement,
  mobile?: MobileConfig,
): RendererConfig {
  return {
    ...getDefaultRendererConfig(mobile),
    canvas,
    width: canvas.clientWidth,
    height: canvas.clientHeight,
  }
}

export function getPerformanceStats(): PerformanceStats {
  return {
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    textures: 0,
    memory: 0,
    deviceScale: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    isMobile: typeof window !== 'undefined'
      ? /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
      : false,
  }
}
