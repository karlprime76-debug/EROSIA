'use client'

import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function ShimmerRing({ delay }: { delay: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const startRef = useRef(0)

  const [ringData] = useState(() => {
    let s = 42 + Math.round(delay * 100)
    const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
    return {
      innerRadius: 0.25 + rand() * 0.15,
      outerRadius: 0.3 + rand() * 0.15,
      color: ['#E8C4A0', '#D4A574', '#F0D5C0'][Math.round(delay * 10 / 3) % 3],
    }
  })

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    if (startRef.current === 0) startRef.current = clock.getElapsedTime()

    const elapsed = clock.getElapsedTime() - startRef.current - delay
    if (elapsed < 0) return
    if (elapsed > 2.5) { meshRef.current.visible = false; return }

    const progress = Math.min(elapsed / 2, 1)
    const scale = 0.1 + progress * 1.6
    const opacity = 0.1 * (1 - progress)

    meshRef.current.scale.setScalar(scale)
    const mat = meshRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = Math.max(0, opacity)
  })

  return (
    <mesh ref={meshRef} frustumCulled={false}>
      <ringGeometry args={[ringData.innerRadius, ringData.outerRadius, 48]} />
      <meshBasicMaterial color={ringData.color} transparent opacity={0.1} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

function ShimmerEffect() {
  return (
    <>
      <ShimmerRing delay={0} />
      <ShimmerRing delay={0.35} />
      <ShimmerRing delay={0.7} />
    </>
  )
}

export function MatchBurst() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 3], fov: 75 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <ShimmerEffect />
      </Canvas>
    </div>
  )
}
