import { NextResponse } from 'next/server'
import { createDefaultPreset } from '@/lib/world'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const PRESET_VARIANTS = [
  { skinTone: '#F5D0B0', hairStyle: 'short', hairColor: '#2C1810', outfit: 'casual', outfitColor: '#D92D4A' },
  { skinTone: '#D4A574', hairStyle: 'long', hairColor: '#4A2810', outfit: 'sport', outfitColor: '#22C55E' },
  { skinTone: '#C68642', hairStyle: 'curly', hairColor: '#1A1A1A', outfit: 'chic', outfitColor: '#1E3A8A' },
  { skinTone: '#F0D5B8', hairStyle: 'bob', hairColor: '#8B4513', outfit: 'party', outfitColor: '#D92D4A' },
  { skinTone: '#E8C39E', hairStyle: 'dreadlocks', hairColor: '#2C1810', outfit: 'beach', outfitColor: '#F59E0B' },
  { skinTone: '#D3A87C', hairStyle: 'ponytail', hairColor: '#1A1A2E', outfit: 'premium', outfitColor: '#FFD700' },
]

export async function GET() {
  try {
    const presets = PRESET_VARIANTS.map((v, i) => ({
      id: `preset-${i + 1}`,
      ...v,
      accessories: [],
    }))

    return NextResponse.json({
      default: createDefaultPreset(),
      presets,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, immutable' },
    })
  } catch (err) {
    logger.error('World presets GET error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
