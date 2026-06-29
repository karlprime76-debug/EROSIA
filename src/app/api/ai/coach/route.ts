import { NextRequest, NextResponse } from 'next/server'
import { analyzeProfile } from '@/lib/coach'
import { getProfile } from '@/lib/api'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const { profileId } = await req.json()

    if (!profileId) {
      return NextResponse.json({ error: 'profileId requis' }, { status: 400 })
    }

    const { data: profile, error } = await getProfile(profileId)
    if (error || !profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    }

    const result = await analyzeProfile({
      name: profile.name,
      bio: profile.bio,
      photos: profile.photos,
      interests: profile.interests,
      occupation: profile.occupation,
      location: profile.location,
      age: profile.age,
      is_verified: profile.is_verified,
      video_url: profile.video_url,
      mood: profile.mood,
      looking_for: profile.looking_for,
      energy_score: profile.energy_score,
    })

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch (err) {
    logger.error('Coach POST error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
