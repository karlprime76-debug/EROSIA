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

    const uid = user.id
    await admin.from('messages').delete().or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
    await admin.from('matches').delete().or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
    await admin.from('swipes').delete().eq('swiper_id', uid)
    await admin.from('flirts').delete().or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
    await admin.from('blocks').delete().or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`)
    await admin.from('reports').delete().or(`reporter_id.eq.${uid},reported_id.eq.${uid}`)
    await admin.from('notifications').delete().eq('user_id', uid)
    await admin.from('gift_transactions').delete().eq('user_id', uid)
    await admin.from('payment_accounts').delete().eq('user_id', uid)
    await admin.from('verification_requests').delete().eq('user_id', uid)
    await admin.from('push_subscriptions').delete().eq('user_id', uid)
    await admin.from('sent_gifts').delete().or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
    await admin.from('duel_votes').delete().eq('voter_id', uid)
    await admin.from('event_participants').delete().eq('user_id', uid)
    await admin.from('user_date_ideas').delete().eq('user_id', uid)
    await admin.from('stories').delete().eq('user_id', uid)
    await admin.from('profiles').delete().eq('id', uid)
    await admin.auth.admin.deleteUser(uid)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la suppression du compte' }, { status: 500 })
  }
}
