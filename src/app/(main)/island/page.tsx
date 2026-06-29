'use client'

import { World, HUD } from '@/components/3d'
import { KeyboardControls } from '@react-three/drei'
import { useState, useEffect } from 'react'

export default function IslandPage() {
  const [playerCount] = useState(0)

  return (
    <KeyboardControls
      map={[
        { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
        { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
        { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
        { name: 'right', keys: ['KeyD', 'ArrowRight'] },
        { name: 'run', keys: ['ShiftLeft'] },
        { name: 'interact', keys: ['KeyE'] },
        { name: 'dance', keys: ['KeyF'] },
        { name: 'wave', keys: ['KeyG'] },
        { name: 'sit', keys: ['KeyR'] },
        { name: 'teleport', keys: ['KeyT'] },
        { name: 'camera', keys: ['KeyC'] },
      ]}
    >
      <div className="fixed inset-0 w-screen h-screen">
        <World />
        <HUD currentZoneId={null} playerCount={playerCount} />
        <ControlsHint />
      </div>
    </KeyboardControls>
  )
}

function ControlsHint() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 6000)
    const handleKey = () => setVisible(false)
    window.addEventListener('keydown', handleKey)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', handleKey)
    }
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-black/60 backdrop-blur-sm rounded-2xl px-5 py-3 text-white/80 text-xs space-y-1 transition-opacity duration-1000">
      <div className="flex items-center justify-center gap-4">
        <span><kbd className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">W A S D</kbd> Se déplacer</span>
        <span><kbd className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">Shift</kbd> Courir</span>
        <span><kbd className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">E</kbd> Interagir</span>
        <span><kbd className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">T</kbd> Téléporter</span>
        <span><kbd className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">C</kbd> Caméra</span>
        <span><kbd className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">F</kbd> Danser</span>
      </div>
    </div>
  )
}
