'use client'

import type { InteractionPoint } from '@/lib/world'

interface InteractionHighlightProps {
  interaction: InteractionPoint
}

const TYPE_COLORS: Record<string, string> = {
  bench: '#8B6914',
  sofa: '#D4A574',
  bar: '#2C1810',
  pool: '#1E90FF',
  bonfire: '#FF6B35',
  pier: '#8B6914',
  dancefloor: '#D92D4A',
}

const TYPE_GEOMETRY: Record<string, [number, number]> = {
  bench: [0.8, 0.3],
  sofa: [1.0, 0.4],
  bar: [1.5, 0.4],
  pool: [2.0, 1.0],
  bonfire: [0.5, 0.2],
  pier: [1.2, 0.3],
  dancefloor: [2.5, 0.1],
}

export function InteractionHighlight({ interaction }: InteractionHighlightProps) {
  const dims = TYPE_GEOMETRY[interaction.type] ?? [0.6, 0.3]
  const color = TYPE_COLORS[interaction.type] ?? '#6B6258'

  return (
    <group position={[interaction.position.x, 0.05, interaction.position.z]} rotation={[0, interaction.rotation, 0]}>
      <mesh>
        <boxGeometry args={[dims[0], dims[1], dims[0]]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
    </group>
  )
}
