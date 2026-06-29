'use client'

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { computeMovement, createInitialState, detectMobile } from '@/lib/world'

export function Avatar() {
  const groupRef = useRef<THREE.Group>(null)
  const stateRef = useRef(createInitialState('beach-club'))
  const isMobile = detectMobile()

  // Desktop keyboard controls
  const [, getKeys] = useKeyboardControls()

  useEffect(() => {
    if (isMobile) return
  }, [isMobile])

  useFrame((_, delta) => {
    if (!groupRef.current || isMobile) return

    const pressed = getKeys()

    const input = {
      forward: pressed?.forward ?? false,
      backward: pressed?.backward ?? false,
      left: pressed?.left ?? false,
      right: pressed?.right ?? false,
      run: pressed?.run ?? false,
    }

    const newState = computeMovement(stateRef.current, input, delta)
    stateRef.current = newState

    groupRef.current.position.x = newState.position.x
    groupRef.current.position.z = newState.position.z
    groupRef.current.rotation.y = newState.rotation
  })

  // Capsule body proxy
  return (
    <group ref={groupRef} position={[0, 0, 5]}>
      {/* Body */}
      <mesh position={[0, 0.8, 0]}>
        <capsuleGeometry args={[0.25, 0.6, 4, 8]} />
        <meshStandardMaterial color="#D92D4A" roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.4, 0]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial color="#F5D0B0" roughness={0.4} />
      </mesh>
    </group>
  )
}
