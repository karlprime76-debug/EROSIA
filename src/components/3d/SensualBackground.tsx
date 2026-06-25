'use client'

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function EmberParticles() {
  const count = 400
  const ref = useRef<THREE.Points>(null)

  const [geom] = useMemo(() => {
    const rand = (() => { let s = 123; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 } })()
    const pos = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * 20
      pos[i * 3 + 1] = (rand() - 0.5) * 16
      pos[i * 3 + 2] = (rand() - 0.5) * 12 - 6
      sizes[i] = rand() * 0.06 + 0.01
      const c = rand()
      if (c < 0.4) { colors[i * 3] = 0.85; colors[i * 3 + 1] = 0.18; colors[i * 3 + 2] = 0.29 }
      else if (c < 0.7) { colors[i * 3] = 0.78; colors[i * 3 + 1] = 0.35; colors[i * 3 + 2] = 0.09 }
      else { colors[i * 3] = 0.96; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 0.84 }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return [g]
  }, [])
  useEffect(() => () => { geom.dispose() }, [geom])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position.array as Float32Array
    const t = clock.getElapsedTime()
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      pos[i3] += Math.sin(t * 0.15 + i * 0.01) * 0.003
      pos[i3 + 1] += Math.sin(t * 0.12 + i * 0.02) * 0.003 + Math.sin(t * 0.05 + i) * 0.001
      pos[i3 + 2] += Math.cos(t * 0.08 + i * 0.015) * 0.002
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref} geometry={geom} frustumCulled={false}>
      <pointsMaterial size={0.035} vertexColors transparent opacity={0.25} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  )
}

function FluidRings() {
  const count = 12
  const ref = useRef<THREE.Group>(null)

  const rings = useMemo(() => {
    const rand = (() => { let s = 456; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 } })()
    const arr: { radius: number; speed: number; color: string; delay: number; z: number }[] = []
    const palette = ['#D92D4A', '#C85A17', '#8B4513', '#A0522D', '#CD5C5C', '#B8860B', '#D92D4A', '#C85A17']
    for (let i = 0; i < count; i++) {
      arr.push({
        radius: rand() * 4 + 0.8,
        speed: rand() * 0.08 + 0.02,
        color: palette[i % palette.length],
        delay: rand() * Math.PI * 2,
        z: rand() * 8 - 4,
      })
    }
    return arr
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.children.forEach((child, i) => {
      const r = rings[i]
      if (!r) return
      const s = 1 + Math.sin(t * r.speed + r.delay) * 0.3
      child.scale.set(s, s, 1)
      child.position.z = r.z + Math.sin(t * 0.1 + i) * 0.5
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
      if (mat) mat.opacity = 0.04 + Math.sin(t * r.speed + r.delay) * 0.03
    })
  })

  return (
    <group ref={ref}>
      {rings.map((r, i) => (
        <mesh key={i} position={[0, 0, r.z]} rotation={[Math.PI / 2, 0, r.delay]}>
          <ringGeometry args={[r.radius, r.radius + 0.03, 80]} />
          <meshBasicMaterial color={r.color} transparent opacity={0.06} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

function FloatingEmbers() {
  const count = 30
  const groupRef = useRef<THREE.Group>(null)

  const [positions] = useMemo(() => {
    const rand = (() => { let s = 789; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 } })()
    const pos: { x: number; y: number; z: number; speed: number; size: number }[] = []
    for (let i = 0; i < count; i++) {
      pos.push({
        x: (rand() - 0.5) * 16,
        y: (rand() - 0.5) * 12,
        z: (rand() - 0.5) * 10,
        speed: rand() * 0.5 + 0.2,
        size: rand() * 0.15 + 0.05,
      })
    }
    return [pos]
  }, [])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    groupRef.current.children.forEach((child, i) => {
      const p = positions[i]
      if (!p) return
      child.position.x = p.x + Math.sin(t * p.speed * 0.3 + i) * 0.8
      child.position.y = p.y + Math.cos(t * p.speed * 0.2 + i * 0.7) * 0.8 + Math.sin(t * 0.15 + i) * 0.4
      child.position.z = p.z + Math.sin(t * 0.1 + i * 0.5) * 0.5
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
      if (mat) mat.opacity = 0.08 + Math.sin(t * p.speed + i * 0.3) * 0.05
    })
  })

  return (
    <group ref={groupRef}>
      {positions.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[p.size, 8, 8]} />
          <meshBasicMaterial color="#D92D4A" transparent opacity={0.1} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  )
}

export function SensualBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 70 }} dpr={[1, 1.5]} gl={{ antialias: false, alpha: true }}>
        <ambientLight intensity={0.2} />
        <EmberParticles />
        <FluidRings />
        <FloatingEmbers />
      </Canvas>
    </div>
  )
}
