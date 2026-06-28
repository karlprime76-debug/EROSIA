import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getEngine } from '@/lib/engine'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const targetId = searchParams.get('targetId')
    if (!targetId) return NextResponse.json({ error: 'targetId requis' }, { status: 400 })

    const engine = getEngine('compatibility')
    if (!engine) return NextResponse.json({ error: 'Engine non trouvé' }, { status: 404 })

    const result = await engine.compute({ userId: user.id, targetId })
    return NextResponse.json(result)
  } catch (err) {
    logger.error('Route error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
