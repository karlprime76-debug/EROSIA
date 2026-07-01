import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const cookieNames = request.cookies.getAll().map(c => c.name)
  logger.debug('[/api/profile/me] cookies received', { cookieNames })
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
          },
        },
      }
    )

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Non authentifié', userId: null }, { status: 401 })
    }

    const PROFILE_FIELDS = 'id, name, age, bio, occupation, location, photos, interests, is_verified, looking_for, created_at, is_admin'
    const { data, error: selErr } = await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', user.id).maybeSingle()

    if (selErr) {
      logger.error('Profile select error', { userId: user.id, error: selErr.message })
      return NextResponse.json({ error: 'Erreur lors du chargement du profil', userId: user.id }, { status: 500 })
    }

    const { data: userScore } = await supabase
      .from('user_scores')
      .select('energy_score, trust_score')
      .eq('user_id', user.id)
      .maybeSingle()

    const profile = {
      ...data,
      energy_score: userScore?.energy_score ? Math.round(userScore.energy_score * 100) : 50,
      trust_score: userScore?.trust_score ? Math.round(userScore.trust_score * 100) : 50,
      mood: 'discuter',
    }

    const response = NextResponse.json({ profile, userId: user.id })
    request.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value))
    return response
  } catch (err) {
    logger.error('[/api/profile/me] exception', err)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
