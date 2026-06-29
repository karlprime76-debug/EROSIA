'use client'

import type { ZoneDefinition } from '@/lib/world'

interface ZoneMeshProps {
  zone: ZoneDefinition
}

export function ZoneMesh({ zone }: ZoneMeshProps) {
  const color = zone.ambientColor

  return (
    <group position={[zone.center.x, 0, zone.center.z]}>
      {/* Zone ground disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[zone.radius, 32]} />
        <meshStandardMaterial color={color} transparent opacity={0.15} roughness={0.8} />
      </mesh>

      {/* Zone label ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[zone.radius - 0.5, zone.radius, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} side={2} />
      </mesh>
    </group>
  )
}
