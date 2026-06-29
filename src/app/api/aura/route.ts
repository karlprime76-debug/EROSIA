import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeAndSaveAura, getAura } from '@/lib/aura'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    let { data: aura, error } = await getAura(user.id, supabase)
    if (error || !aura) {
      const result = await computeAndSaveAura(user.id, supabase)
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
      aura = result.data
    }

    return NextResponse.json({ aura })
  } catch (err) {
    logger.error('Aura GET error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const result = await computeAndSaveAura(user.id, supabase)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json({ aura: result.data })
  } catch (err) {
    logger.error('Aura POST error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
