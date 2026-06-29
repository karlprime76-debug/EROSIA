import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { energyScoreEngine } from '@/lib/engine'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const result = await energyScoreEngine.compute({ userId: user.id })
    const score = result.score

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ energy_score: score })
      .eq('id', user.id)

    if (updateError) {
      logger.error('Energy score update failed', { error: updateError.message, userId: user.id })
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
    }

    return NextResponse.json({ score, factors: result.factors })
  } catch (err) {
    logger.error('Energy score route error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
