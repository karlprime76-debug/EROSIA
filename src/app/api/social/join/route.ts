import { NextResponse } from 'next/server'
import { joinSpace } from '@/lib/social-space'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { joinSpaceSchema } from '@/lib/validations'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    let body: Record<string, unknown>
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 }) }
    const parsed = joinSpaceSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'spaceId requis' }, { status: 400 })
    const { spaceId, x, y, z } = parsed.data

    const { data, error } = await joinSpace(spaceId, x, y, z)
    if (error) return NextResponse.json({ error: String(error ?? 'Erreur') }, { status: 400 })

    return NextResponse.json({ presence: data })
  } catch (err) {
    logger.error('Join space error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
