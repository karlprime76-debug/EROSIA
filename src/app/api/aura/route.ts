import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeAndSaveAura, getAura } from '@/lib/aura'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: auraData, error: auraError } = await getAura(user.id, supabase)
    let aura = auraData
    if (auraError || !aura) {
      const result = await computeAndSaveAura(user.id, supabase)
      if (result.error) {
        logger.error('computeAndSaveAura failed', { userId: user.id, error: String(result.error ?? 'Erreur') })
        return NextResponse.json({ error: String(result.error ?? 'Erreur') }, { status: 400 })
      }
      aura = result.data
    }

    return NextResponse.json({ aura }, {
      headers: { 'Cache-Control': 'private, s-maxage=30' },
    })
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
    if (result.error) return NextResponse.json({ error: String(result.error ?? 'Erreur') }, { status: 400 })

    return NextResponse.json({ aura: result.data })
  } catch (err) {
    logger.error('Aura POST error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
