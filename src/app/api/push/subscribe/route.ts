import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { pushSubscribeSchema } from '@/lib/validations'

export async function POST(request: Request) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    let body: Record<string, unknown>
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }
    const parsed = pushSubscribeSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }
    const { endpoint, keys } = parsed.data

    const admin = createAdminClient()
    const { error } = await admin.from('push_subscriptions').insert({
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    })

    if (error) return NextResponse.json({ error: 'Erreur lors de l\'inscription aux notifications' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('Push subscribe error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    let raw: Record<string, unknown>
    try { raw = await request.json() } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }
    const parsed = z.object({ endpoint: z.string().url() }).safeParse(raw)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'endpoint requis'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: sub } = await admin.from('push_subscriptions').select('user_id').eq('endpoint', parsed.data.endpoint).maybeSingle()
    if (!sub) return NextResponse.json({ error: 'Abonnement introuvable' }, { status: 404 })
    if (sub.user_id !== user.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    const { error } = await admin.from('push_subscriptions').delete().eq('endpoint', parsed.data.endpoint)
    if (error) return NextResponse.json({ error: 'Erreur lors du désabonnement' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('Push subscribe error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
