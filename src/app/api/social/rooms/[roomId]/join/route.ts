import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { joinRoom } from '@/lib/social'
import { logger } from '@/lib/logger'
import { joinRoomSchema } from '@/lib/validations'

export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { roomId } = await params
    const body = await req.json().catch(() => ({}))
    const parsed = joinRoomSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    const { x, y, z, rotation_y, animation } = parsed.data

    const { data, error } = await joinRoom(roomId, { x, y, z, rotation_y, animation })

    if (error) return NextResponse.json({ error: String(error ?? 'Erreur') }, { status: 400 })

    return NextResponse.json({ presence: data }, { status: 201 })
  } catch (err) {
    logger.error('Social room join POST error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
