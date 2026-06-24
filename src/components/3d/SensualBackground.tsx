'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function EmberParticles() {
  const count = 200
  const ref = useRef<THREE.Points>(null)

  const [geom] = useMemo(() => {
    let s = 123
    const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
    const pos = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * 16
      pos[i * 3 + 1] = (rand() - 0.5) * 12
      pos[i * 3 + 2] = (rand() - 0.5) * 8 - 4
      sizes[i] = rand() * 0.04 + 0.01
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return [g]
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position.array as Float32Array
    const t = clock.getElapsedTime()
    for (let i = 0; i < count; i++) {
      pos[i * 3] += Math.sin(t * 0.3 + i) * 0.002
      pos[i * 3 + 1] += Math.sin(t * 0.2 + i * 0.5) * 0.002
      pos[i * 3 + 2] += Math.cos(t * 0.15 + i * 0.3) * 0.001
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial size={0.04} color="#D4782B" transparent opacity={0.3} sizeAttenuation blending={THREE.AdditiveBlending} />
    </points>
  )
}

function FluidRings() {
  const count = 6
  const ref = useRef<THREE.Group>(null)

  const rings = useMemo(() => {
    const arr: { radius: number; speed: number; color: string; delay: number }[] = []
    let s = 456
    const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
    for (let i = 0; i < count; i++) {
      arr.push({
        radius: rand() * 3 + 1,
        speed: rand() * 0.1 + 0.05,
        color: ['#D92D4A', '#C85A17', '#8B4513', '#A0522D', '#CD5C5C', '#B8860B'][i],
        delay: rand() * Math.PI * 2,
      })
    }
    return arr
  }, [])

  return (
    <group ref={ref}>
      {rings.map((r, i) => (
        <mesh key={i} position={[0, 0, -2]} rotation={[Math.PI / 2, 0, r.delay]}>
          <ringGeometry args={[r.radius, r.radius + 0.02, 64]} />
          <meshBasicMaterial color={r.color} transparent opacity={0.06} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

export function SensualBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <Canvas camera={{ position: [0, 0, 6], fov: 75 }} dpr={[1, 1.5]} gl={{ antialias: false, alpha: true }}>
        <ambientLight intensity={0.3} />
        <EmberParticles />
        <FluidRings />
      </Canvas>
    </div>
  )
}
