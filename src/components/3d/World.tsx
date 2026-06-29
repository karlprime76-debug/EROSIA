'use client'

import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { Suspense } from 'react'
import { ErosiaIsland } from './ErosiaIsland'
import { CameraManager } from './CameraManager'
import { LightingManager } from './LightingManager'

export function World() {
  return (
    <Canvas
      shadows
      dpr={[0.5, 1.5]}
      camera={{ fov: 50, near: 0.1, far: 500 }}
      gl={{
        antialias: true,
        toneMapping: 3, // ACESFilmic
        outputColorSpace: 'srgb',
      }}
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh' }}
    >
      <Suspense fallback={null}>
        <color attach="background" args={['#0A0A2E'] as any} />

        <ErosiaIsland />
        <CameraManager />
        <LightingManager />

        <Environment preset="sunset" />
      </Suspense>
    </Canvas>
  )
}
