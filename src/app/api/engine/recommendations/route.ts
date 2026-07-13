import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recommendationEngine } from '@/lib/engine'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '0', 10)
    const minAge = searchParams.get('minAge')
    const maxAge = searchParams.get('maxAge')
    const lookingFor = searchParams.get('lookingFor')
    const maxDistance = searchParams.get('maxDistance')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const city = searchParams.get('city')

    const admin = createAdminClient()

    // Récupérer les préférences de genre de l'utilisateur
    const { data: userProfile } = await admin
      .from('profiles')
      .select('gender, interested_in')
      .eq('id', user.id)
      .maybeSingle()

    // Exclure les profils invisible-only (compatible-only check simplifié)
    const { data: invisibleUsers } = await admin
      .from('privacy_settings')
      .select('user_id')
      .eq('visible_to_compatible_only', true)

    const result = await recommendationEngine.compute({
      userId: user.id,
      excludeIds: [],
      page,
      limit: 20,
      filters: {
        ...(minAge ? { minAge: parseInt(minAge, 10) } : {}),
        ...(maxAge ? { maxAge: parseInt(maxAge, 10) } : {}),
        ...(lookingFor ? { lookingFor } : {}),
        ...(maxDistance ? { maxDistance: parseInt(maxDistance, 10) } : {}),
        ...(lat ? { lat: parseFloat(lat) } : {}),
        ...(lng ? { lng: parseFloat(lng) } : {}),
        ...(city ? { city } : {}),
        ...(invisibleUsers?.length ? { excludeInvisible: invisibleUsers.map(u => u.user_id) } : {}),
        ...(userProfile?.gender ? { gender: userProfile.gender } : {}),
        ...(userProfile?.interested_in?.length ? { interestedIn: userProfile.interested_in } : {}),
      },
    }, admin)

    return NextResponse.json(result)
  } catch (err) {
    logger.error('Recommendations GET error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
