'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { computeDayNightState, computeLighting } from '@/lib/world'

export function LightingManager() {
  const timeRef = useRef(12) // start at noon
  const dirLightRef = useRef<THREE.DirectionalLight>(null)

  useFrame((_, delta) => {
    // Advance time: 1 real second = ~1 game minute
    timeRef.current = (timeRef.current + delta * 0.02) % 24
    const dayState = computeDayNightState(timeRef.current)
    const lighting = computeLighting(dayState)

    if (dirLightRef.current) {
      const angle = dayState.sunAltitude * Math.PI * 2
      const x = 100 * Math.cos(angle)
      const y = 100 * Math.sin(Math.max(angle, -0.5))
      const z = 100 * Math.sin(angle) * 0.5
      dirLightRef.current.position.set(x, y + 10, z)
      dirLightRef.current.intensity = lighting.directionalIntensity
    }
  })

  return (
    <>
      <ambientLight intensity={0.4} color="#87CEEB" />
      <directionalLight
        ref={dirLightRef}
        position={[50, 50, 30]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={150}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
      <hemisphereLight args={['#87CEEB', '#1a1a2e', 0.6]} />
    </>
  )
}
