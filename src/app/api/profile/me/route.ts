import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const cookieNames = request.cookies.getAll().map(c => c.name)
  console.log('[/api/profile/me] cookies received:', cookieNames)
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
    console.log('[/api/profile/me] getUser result:', user?.id, user?.email, authErr?.message)
    if (authErr || !user) {
      return NextResponse.json({ error: 'Non authentifié', userId: null, authErr: authErr?.message }, { status: 401 })
    }

    const PROFILE_FIELDS = 'id, name, age, bio, occupation, location, photos, interests, is_verified, looking_for, created_at, last_seen, video_url'
    const { data, error: selErr } = await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', user.id).maybeSingle()

    console.log('[/api/profile/me] select result:', data?.id, data?.name, selErr?.message)

    if (selErr) {
      return NextResponse.json({ error: selErr.message, userId: user.id }, { status: 500 })
    }

    return NextResponse.json({ profile: data, userId: user.id })
  } catch (err) {
    console.error('[/api/profile/me] exception:', String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
