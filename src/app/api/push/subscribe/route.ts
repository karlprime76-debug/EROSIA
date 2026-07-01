import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    let body: { endpoint: string; keys: { p256dh: string; auth: string } }
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }
    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json({ error: 'endpoint, p256dh, auth requis' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin.from('push_subscriptions').insert({
      user_id: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    })

    if (error) return NextResponse.json({ error: 'Erreur lors de l\'inscription aux notifications' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    let body: { endpoint: string }
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }
    if (!body.endpoint) return NextResponse.json({ error: 'endpoint requis' }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin.from('push_subscriptions').delete().eq('endpoint', body.endpoint)
    if (error) return NextResponse.json({ error: 'Erreur lors du désabonnement' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
