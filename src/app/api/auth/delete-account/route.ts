import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { deleteAccountSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    let body: Record<string, unknown>
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 }) }
    const parsed = deleteAccountSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Mot de passe requis' }, { status: 400 })
    const { password } = parsed.data
    if (!user.email) return NextResponse.json({ error: 'Impossible de vérifier l\'identité' }, { status: 400 })
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password })
    if (signInError) return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 403 })

    const admin = createAdminClient()

    const uid = user.id
    const errors: string[] = []

    // ── Storage cleanup ──
    const storagePaths = [
      { bucket: 'photos', prefix: `${uid}/` },
      { bucket: 'profile_videos', prefix: `profile_videos/${uid}/` },
      { bucket: 'event_images', prefix: `events/${uid}/` },
      { bucket: 'stories', prefix: `stories/${uid}/` },
    ]
    for (const { bucket, prefix } of storagePaths) {
      try {
        const { data: files, error: listErr } = await admin.storage.from(bucket).list(prefix)
        if (listErr) { errors.push(`${bucket}:list ${listErr.message}`); continue }
        if (files && files.length > 0) {
          const paths = files.map(f => `${prefix}${f.name}`)
          const { error: removeErr } = await admin.storage.from(bucket).remove(paths)
          if (removeErr) errors.push(`${bucket}:remove ${removeErr.message}`)
        }
      } catch (e) { errors.push(`${bucket}: ${String(e)}`) }
    }

    const tables = [
      ['messages',        async () => {
        const { data: matchRows } = await admin.from('matches').select('id').or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
        if (matchRows && matchRows.length > 0) {
          for (const m of matchRows) { await admin.from('messages').delete().eq('match_id', m.id) }
        }
        await admin.from('messages').delete().eq('sender_id', uid)
      }],
      ['matches',         () => admin.from('matches').delete().or(`user1_id.eq.${uid},user2_id.eq.${uid}`)],
      ['swipes',          () => admin.from('swipes').delete().or(`swiper_id.eq.${uid},swiped_id.eq.${uid}`)],
      ['flirts',          () => admin.from('flirts').delete().or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)],
      ['blocks',          () => admin.from('blocks').delete().or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`)],
      ['reports',         () => admin.from('reports').delete().or(`reporter_id.eq.${uid},reported_id.eq.${uid}`)],
      ['notifications',   () => admin.from('notifications').delete().eq('user_id', uid)],
      ['gift_transactions', () => admin.from('gift_transactions').delete().eq('user_id', uid)],
      ['payment_accounts', () => admin.from('payment_accounts').delete().eq('user_id', uid)],
      ['verification_requests', () => admin.from('verification_requests').delete().eq('user_id', uid)],
      ['push_subscriptions', () => admin.from('push_subscriptions').delete().eq('user_id', uid)],
      ['sent_gifts',      () => admin.from('sent_gifts').delete().or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)],

      ['event_participants', () => admin.from('event_participants').delete().eq('user_id', uid)],
      ['user_date_ideas', () => admin.from('user_date_ideas').delete().eq('user_id', uid)],
      ['stories',         () => admin.from('stories').delete().eq('user_id', uid)],
      ['profiles',        () => admin.from('profiles').delete().eq('id', uid)],
    ] as const

    for (const [name, del] of tables) {
      try { await del() } catch (e) { errors.push(`${name}: ${String(e)}`) }
    }

    try { await admin.auth.admin.deleteUser(uid) } catch (e) {
      errors.push(`auth.deleteUser: ${String(e)}`)
    }

    if (errors.length > 0) {
      logger.error('Delete account partial errors', { userId: uid, errors })
      return NextResponse.json({ error: 'Erreur lors de la suppression du compte' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('Delete account error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur lors de la suppression du compte' }, { status: 500 })
  }
}
