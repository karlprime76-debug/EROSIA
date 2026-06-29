import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getEngine } from '@/lib/engine'
import type { TrustInput, TrustOutput } from '@/lib/engine'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const engine = getEngine<TrustInput, TrustOutput>('trust')
    if (!engine) return NextResponse.json({ error: 'Trust engine non trouvé' }, { status: 500 })

    const result = await engine.compute({ userId: user.id })
    const score = result.score

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ trust_score: score })
      .eq('id', user.id)

    if (updateError) {
      logger.error('Trust score update failed', { error: updateError.message, userId: user.id })
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
    }

    return NextResponse.json({ score })
  } catch (err) {
    logger.error('Trust score route error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
