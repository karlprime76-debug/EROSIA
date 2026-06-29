'use client'

import type { NPCDefinition } from '@/lib/world'

interface NPCProps {
  npc: NPCDefinition
}

export function NPC({ npc }: NPCProps) {
  return (
    <group position={[npc.position.x, npc.position.y, npc.position.z]} rotation={[0, npc.rotation, 0]}>
      {/* Body */}
      <mesh position={[0, 0.8, 0]}>
        <capsuleGeometry args={[0.22, 0.55, 4, 8]} />
        <meshStandardMaterial color="#6B6258" roughness={0.7} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.35, 0]}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial color="#E8C39E" roughness={0.5} />
      </mesh>
    </group>
  )
}
