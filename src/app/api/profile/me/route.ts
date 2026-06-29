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
          setAll() {},
        },
      }
    )

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    logger.debug('[/api/profile/me] getUser result', { userId: user?.id, email: user?.email, authErr: authErr?.message })
    if (authErr || !user) {
      return NextResponse.json({ error: 'Non authentifié', userId: null, authErr: authErr?.message }, { status: 401 })
    }

    const PROFILE_FIELDS = 'id, name, age, bio, occupation, location, photos, interests, is_verified, looking_for, mood, energy_score, trust_score, created_at, video_url'
    const { data, error: selErr } = await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', user.id).maybeSingle()

    logger.debug('[/api/profile/me] select result', { id: data?.id, name: data?.name, selErr: selErr?.message })

    if (selErr) {
      return NextResponse.json({ error: selErr.message, userId: user.id }, { status: 500 })
    }

    return NextResponse.json({ profile: data, userId: user.id })
  } catch (err) {
    logger.error('[/api/profile/me] exception', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
