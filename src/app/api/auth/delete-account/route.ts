import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const admin = createAdminClient()

    await admin.from('matches').delete().or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    await admin.from('messages').delete().eq('sender_id', user.id)
    await admin.from('swipes').delete().eq('swiper_id', user.id)
    await admin.from('flirts').delete().eq('sender_id', user.id)
    await admin.from('blocks').delete().eq('blocker_id', user.id)
    await admin.from('reports').delete().eq('reporter_id', user.id)
    await admin.from('notifications').delete().eq('user_id', user.id)
    await admin.from('duel_votes').delete().eq('voter_id', user.id)
    await admin.from('event_participants').delete().eq('user_id', user.id)
    await admin.from('sent_gifts').delete().eq('sender_id', user.id)
    await admin.from('user_date_ideas').delete().eq('user_id', user.id)
    await admin.from('stories').delete().eq('user_id', user.id)
    await admin.from('profiles').delete().eq('id', user.id)
    await admin.auth.admin.deleteUser(user.id)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la suppression du compte' }, { status: 500 })
  }
}
