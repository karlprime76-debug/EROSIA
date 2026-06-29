'use client'

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createCameraState, computeCameraPosition } from '@/lib/world'

export function CameraManager() {
  const { camera } = useThree()
  const stateRef = useRef(createCameraState('third-person', { x: 0, y: 1, z: 5 }))

  // In a full implementation, mouse/touch input would update azimuth/elevation here

  useFrame(() => {
    const { position, target } = computeCameraPosition(stateRef.current)
    camera.position.lerp(new THREE.Vector3(position.x, position.y, position.z), 0.1)
    camera.lookAt(target.x, target.y, target.z)
  })

  return null
}
