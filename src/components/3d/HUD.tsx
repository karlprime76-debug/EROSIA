'use client'

import { useEffect, useState } from 'react'
import { MapPin, Sun, Users, Compass } from 'lucide-react'
import type { ZoneId } from '@/lib/world'
import { getZone, computeDayNightState, getMobileConfig } from '@/lib/world'

interface HUDProps {
  currentZoneId: ZoneId | null
  playerCount: number
}

const PHASE_LABELS: Record<string, string> = {
  dawn: 'Aube', morning: 'Matin', noon: 'Après-midi', dusk: 'Crépuscule', night: 'Nuit',
}

export function HUD({ currentZoneId, playerCount }: HUDProps) {
  const [time, setTime] = useState(12)
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    setMobile(getMobileConfig().pixelRatio < 2)
    const tick = setInterval(() => {
      setTime(t => (t + 0.02) % 24)
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  const dayState = computeDayNightState(time)
  const zone = currentZoneId ? getZone(currentZoneId) : null

  if (mobile) {
    return (
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-[10px]">
        {zone && <span>{zone.name}</span>}
        <span className="text-white/50">·</span>
        <span>{playerCount}</span>
        <Users size={10} />
      </div>
    )
  }

  return (
    <div className="fixed top-4 left-4 z-50 space-y-1.5">
      {/* Zone info */}
      <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-xl px-3.5 py-2 text-white text-xs">
        <MapPin size={12} className="text-[#D92D4A]" />
        <span className="font-medium">{zone?.name ?? 'Erosia Island'}</span>
        <span className="text-white/40">·</span>
        <span className="text-white/60">{playerCount} en ligne</span>
        <Users size={11} className="text-white/40" />
      </div>

      {/* Time & weather */}
      <div className="flex items-center gap-3 bg-black/40 backdrop-blur-sm rounded-xl px-3.5 py-2 text-white text-[10px]">
        <div className="flex items-center gap-1">
          <Sun size={10} />
          <span className="text-white/80">{PHASE_LABELS[dayState.phase]}</span>
        </div>
        <span className="text-white/30">·</span>
        <span>{Math.floor(time)}:{String(Math.floor((time % 1) * 60)).padStart(2, '0')}</span>
        <span className="text-white/30">·</span>
        <div className="flex items-center gap-1">
          <Compass size={10} />
          <span>{Math.round(dayState.sunAzimuth * 180 / Math.PI)}°</span>
        </div>
      </div>
    </div>
  )
}
