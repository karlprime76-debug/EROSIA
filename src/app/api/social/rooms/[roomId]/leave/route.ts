import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { leaveRoom } from '@/lib/social'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { error } = await leaveRoom()
    if (error) return NextResponse.json({ error: String(error ?? 'Erreur') }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Social room leave POST error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
