import { NextRequest, NextResponse } from 'next/server'
import { getPresence } from '@/lib/social'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { roomId } = await params

    const { data, error } = await getPresence(roomId)

    if (error) return NextResponse.json({ error: String(error ?? 'Erreur') }, { status: 500 })

    return NextResponse.json({ presence: data })
  } catch (err) {
    logger.error('Social presence GET error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
