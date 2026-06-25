'use client'

import { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 250

function DustParticles() {
  const ref = useRef<THREE.Points>(null)

  const [geometry] = useState(() => {
    let s = 42
    const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }

    const positions = new Float32Array(COUNT * 3)
    const speeds = new Float32Array(COUNT)
    const phases = new Float32Array(COUNT)

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (rand() - 0.5) * 24
      positions[i * 3 + 1] = (rand() - 0.5) * 18
      positions[i * 3 + 2] = (rand() - 0.5) * 12 - 3
      speeds[i] = 0.006 + rand() * 0.018
      phases[i] = rand() * Math.PI * 2
    }

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geom.userData = { speeds, phases }
    return geom
  })
  useEffect(() => () => { geometry.dispose() }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position.array as Float32Array
    const { speeds, phases } = ref.current.geometry.userData as { speeds: Float32Array; phases: Float32Array }
    if (!speeds || !phases) return
    const t = clock.getElapsedTime()
    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3
      pos[i3] += Math.sin(t * speeds[i] + phases[i]) * 0.0004
      pos[i3 + 1] += Math.cos(t * speeds[i] * 0.6 + phases[i]) * 0.0003
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.03}
        color="#F5E6D3"
        transparent
        opacity={0.2}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export function FloatingHearts() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <DustParticles />
      </Canvas>
    </div>
  )
}
