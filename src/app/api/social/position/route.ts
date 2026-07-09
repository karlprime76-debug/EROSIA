import { NextResponse } from 'next/server'
import { updatePosition } from '@/lib/social-space'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { socialPositionSchema } from '@/lib/validations'

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    let body: Record<string, unknown>
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }
    const parsed = socialPositionSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }
    const { x, y } = parsed.data
    const zNum = (body as Record<string, unknown>).z as number | undefined
    const rotationY = (body as Record<string, unknown>).rotationY as number | undefined
    const animation = (body as Record<string, unknown>).animation as string | undefined
    if (zNum === undefined) {
      return NextResponse.json({ error: 'z requis' }, { status: 400 })
    }

    const { error } = await updatePosition(x, y, zNum, rotationY, animation)
    if (error) return NextResponse.json({ error: String(error ?? 'Erreur') }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Position update error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
