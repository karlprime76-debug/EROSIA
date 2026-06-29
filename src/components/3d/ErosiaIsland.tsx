'use client'

import { useMemo } from 'react'
import { getAllZones, generateNPCs } from '@/lib/world'
import { ZoneMesh } from './ZoneMesh'
import { Avatar } from './Avatar'
import { NPC } from './NPC'
import { TeleporterGlow } from './TeleporterGlow'
import { InteractionHighlight } from './InteractionHighlight'

export function ErosiaIsland() {
  const zones = useMemo(() => getAllZones(), [])
  const npcs = useMemo(() => generateNPCs(), [])

  return (
    <group>
      {/* Ground plane — whole island */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#1a3a1a" roughness={0.9} />
      </mesh>

      {/* Water surrounding the island */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial
          color="#1E90FF"
          transparent
          opacity={0.4}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Zone meshes */}
      {zones.map(zone => (
        <ZoneMesh key={zone.id} zone={zone} />
      ))}

      {/* Teleporter points */}
      {zones.flatMap(zone =>
        zone.teleporters.map(tp => (
          <TeleporterGlow key={tp.id} teleporter={tp} />
        ))
      )}

      {/* Interaction points */}
      {zones.flatMap(zone =>
        zone.interactions.map(interaction => (
          <InteractionHighlight key={interaction.id} interaction={interaction} />
        ))
      )}

      {/* NPCs */}
      {npcs.map(npc => (
        <NPC key={npc.id} npc={npc} />
      ))}

      {/* Avatar placeholder */}
      <Avatar />
    </group>
  )
}
