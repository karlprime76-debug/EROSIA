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
    const errors: string[] = []

    const tables = [
      ['messages',        () => admin.from('messages').delete().or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)],
      ['matches',         () => admin.from('matches').delete().or(`user1_id.eq.${uid},user2_id.eq.${uid}`)],
      ['swipes',          () => admin.from('swipes').delete().eq('swiper_id', uid)],
      ['flirts',          () => admin.from('flirts').delete().or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)],
      ['blocks',          () => admin.from('blocks').delete().or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`)],
      ['reports',         () => admin.from('reports').delete().or(`reporter_id.eq.${uid},reported_id.eq.${uid}`)],
      ['notifications',   () => admin.from('notifications').delete().eq('user_id', uid)],
      ['gift_transactions', () => admin.from('gift_transactions').delete().eq('user_id', uid)],
      ['payment_accounts', () => admin.from('payment_accounts').delete().eq('user_id', uid)],
      ['verification_requests', () => admin.from('verification_requests').delete().eq('user_id', uid)],
      ['push_subscriptions', () => admin.from('push_subscriptions').delete().eq('user_id', uid)],
      ['sent_gifts',      () => admin.from('sent_gifts').delete().or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)],
      ['duel_votes',      () => admin.from('duel_votes').delete().eq('voter_id', uid)],
      ['event_participants', () => admin.from('event_participants').delete().eq('user_id', uid)],
      ['user_date_ideas', () => admin.from('user_date_ideas').delete().eq('user_id', uid)],
      ['stories',         () => admin.from('stories').delete().eq('user_id', uid)],
      ['profiles',        () => admin.from('profiles').delete().eq('id', uid)],
    ] as const

    for (const [name, del] of tables) {
      try { await del() } catch (e) { errors.push(`${name}: ${String(e)}`) }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Erreur lors de la suppression du compte' }, { status: 500 })
    }

    try { await admin.auth.admin.deleteUser(uid) } catch {
      return NextResponse.json({ error: 'Erreur lors de la suppression du compte' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la suppression du compte' }, { status: 500 })
  }
}
