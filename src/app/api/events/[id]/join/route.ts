import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { joinEvent } from '@/lib/events'
import { logger } from '@/lib/logger'
import { joinEventSchema } from '@/lib/validations'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await params

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }
    const parsed = joinEventSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { data, error } = await joinEvent(id)

    if (error) return NextResponse.json({ error: String(error ?? 'Erreur') }, { status: 500 })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    logger.error('Events join POST error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
