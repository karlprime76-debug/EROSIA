import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updatePosition } from '@/lib/social'
import { logger } from '@/lib/logger'
import { updatePositionSchema } from '@/lib/validations'

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const parsed = updatePositionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'x, y, z requis' }, { status: 400 })
    const { x, y, z, rotation_y, animation } = parsed.data

    const { error } = await updatePosition(x, y, z, rotation_y, animation)

    if (error) return NextResponse.json({ error: String(error ?? 'Erreur') }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Social position PUT error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
