'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Teleporter } from '@/lib/world'

interface TeleporterGlowProps {
  teleporter: Teleporter
}

export function TeleporterGlow({ teleporter }: TeleporterGlowProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5
    }
  })

  return (
    <group position={[teleporter.position.x, 0.5, teleporter.position.z]}>
      <mesh ref={meshRef}>
        <torusGeometry args={[0.6, 0.08, 8, 24]} />
        <meshStandardMaterial color="#D92D4A" emissive="#D92D4A" emissiveIntensity={0.3} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.4, 0.6, 0.1, 16]} />
        <meshStandardMaterial color="#D92D4A" transparent opacity={0.2} />
      </mesh>
    </group>
  )
}
