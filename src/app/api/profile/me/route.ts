import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié', userId: null }, { status: 401 })
    }

    const { data: profile, error: selErr } = await supabase
      .from('profiles')
      .select('id, name, age, bio, occupation, location, photos, interests, is_verified, looking_for, created_at, is_admin, energy_score, trust_score')
      .eq('id', user.id)
      .maybeSingle()

    if (selErr) {
      logger.error('Profile select error', { userId: user.id, error: selErr.message })
      return NextResponse.json({ error: 'Erreur lors du chargement du profil', userId: user.id }, { status: 500 })
    }

    return NextResponse.json({ profile: { ...profile, mood: 'discuter' }, userId: user.id })
  } catch (err) {
    logger.error('[/api/profile/me] exception', err)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
