import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getEngine } from '@/lib/engine'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const body = await request.json()
    const targetUserId = body.userId as string | undefined
    const engineName = body.engine as string | undefined

    const admin = createAdminClient()

    if (engineName) {
      const engine = getEngine(engineName)
      if (!engine) return NextResponse.json({ error: 'Engine inconnu' }, { status: 404 })
      const result = await engine.compute({ userId: targetUserId ?? user.id, targetId: body.targetId ?? targetUserId ?? user.id }, admin)
      return NextResponse.json({ engine: engineName, result })
    }

    const engines = ['compatibility', 'behavior', 'conversation', 'trust', 'activity', 'interest-graph', 'spark-score']
    const results: Record<string, unknown> = {}
    for (const name of engines) {
      const engine = getEngine(name)
      if (engine) {
        const input = { userId: targetUserId ?? user.id, targetId: body.targetId ?? targetUserId ?? user.id }
        results[name] = await engine.compute(input, admin)
      }
    }

    return NextResponse.json(results)
  } catch (err) {
    logger.error('Route error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
