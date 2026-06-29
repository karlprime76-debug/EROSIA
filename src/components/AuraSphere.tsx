'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { AuraState } from '@/lib/aura/types'

interface AuraSphereProps {
  aura: AuraState
  size?: number
  pulse?: boolean
}

const LABEL_ICON: Record<string, string> = {
  Brouillard: '🌫️',
  Lueur: '✨',
  Éclat: '💫',
  Rayonnement: '🌟',
  Auréole: '👑',
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function AuraSphere({ aura, size = 80, pulse = true }: AuraSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const center = size / 2
    const radius = size * 0.35
    const count = aura.particleCount
    const particles: { angle: number; speed: number; dist: number; size: number; alpha: number }[] = []

    let s = 42
    const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }

    for (let i = 0; i < count; i++) {
      particles.push({
        angle: rand() * Math.PI * 2,
        speed: 0.002 + rand() * 0.008,
        dist: radius * (0.6 + rand() * 0.5),
        size: 0.5 + rand() * 2,
        alpha: 0.1 + rand() * 0.3,
      })
    }

    const draw = (time: number) => {
      ctx.clearRect(0, 0, size, size)

      const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius * 1.5)
      gradient.addColorStop(0, aura.color + '40')
      gradient.addColorStop(0.4, aura.secondaryColor + '30')
      gradient.addColorStop(0.7, aura.color + '10')
      gradient.addColorStop(1, 'transparent')

      ctx.beginPath()
      ctx.arc(center, center, radius * 1.5, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()

      const glowSize = radius * 1.2 * aura.glowIntensity
      const glowGrad = ctx.createRadialGradient(center, center, 0, center, center, glowSize)
      glowGrad.addColorStop(0, aura.color + '60')
      glowGrad.addColorStop(0.5, aura.secondaryColor + '30')
      glowGrad.addColorStop(1, 'transparent')

      ctx.beginPath()
      ctx.arc(center, center, glowSize, 0, Math.PI * 2)
      ctx.fillStyle = glowGrad
      ctx.fill()

      const innerGrad = ctx.createRadialGradient(center, center, 0, center, center, radius)
      innerGrad.addColorStop(0, aura.color + '80')
      innerGrad.addColorStop(0.6, aura.secondaryColor + '50')
      innerGrad.addColorStop(1, aura.color + '20')

      ctx.beginPath()
      ctx.arc(center, center, radius, 0, Math.PI * 2)
      ctx.fillStyle = innerGrad
      ctx.fill()

      ctx.beginPath()
      ctx.arc(center, center, radius, 0, Math.PI * 2)
      ctx.strokeStyle = aura.color + '60'
      ctx.lineWidth = 1.5
      ctx.stroke()

      if (pulse) {
        const pulsePhase = Math.sin(time * 0.002) * 0.15 + 0.85
        ctx.beginPath()
        ctx.arc(center, center, radius * pulsePhase, 0, Math.PI * 2)
        ctx.strokeStyle = aura.secondaryColor + '30'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      for (const p of particles) {
        p.angle += p.speed * (pulse ? (1 + Math.sin(time * 0.001 + p.angle) * 0.3) : 1)
        const x = center + Math.cos(p.angle) * p.dist
        const y = center + Math.sin(p.angle) * p.dist
        const alpha = p.alpha * (0.5 + Math.sin(time * 0.003 + p.angle * 2) * 0.5)
        ctx.beginPath()
        ctx.arc(x, y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = hexToRgba(aura.secondaryColor, alpha)
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [aura, size, pulse])

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: size, height: size }}
      />
      <span className="relative text-lg z-10 pointer-events-none select-none">
        {LABEL_ICON[aura.label] ?? '✨'}
      </span>
      <span
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-semibold whitespace-nowrap px-1.5 py-0.5 rounded-full z-10"
        style={{
          background: aura.color + '30',
          color: aura.color,
          border: `1px solid ${aura.color}40`,
        }}
      >
        {aura.level}
      </span>
    </div>
  )
}

export function AuraBadge({ aura }: { aura: AuraState }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold"
      style={{
        background: aura.color + '20',
        color: aura.color,
        border: `1px solid ${aura.color}30`,
      }}
    >
      <span>{LABEL_ICON[aura.label] ?? '✨'}</span>
      <span>{aura.label}</span>
      <span className="opacity-60">·</span>
      <span>{aura.level}</span>
    </div>
  )
}

export function useAura(userId?: string) {
  const [aura, setAura] = useState<AuraState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const url = userId ? `/api/aura?userId=${userId}` : '/api/aura'
      const res = await fetch(url)
      const json = await res.json()
      if (json.aura) setAura(json.aura)
      else setError(json.error)
    } catch {
      setError('Erreur réseau')
    }
    setLoading(false)
  }, [userId])

  const recompute = useCallback(async () => {
    setLoading(true)
    try {
      const url = userId ? `/api/aura?userId=${userId}` : '/api/aura'
      const res = await fetch(url, { method: 'POST' })
      const json = await res.json()
      if (json.aura) setAura(json.aura)
      else setError(json.error)
    } catch {
      setError('Erreur réseau')
    }
    setLoading(false)
  }, [userId])

  useEffect(() => { refresh() }, [refresh]) // eslint-disable-line react-hooks/set-state-in-effect

  return { aura, loading, error, refresh, recompute }
}
