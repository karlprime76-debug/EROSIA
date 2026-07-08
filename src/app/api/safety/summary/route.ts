import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const [blockedRes, consentRes, revokedRes] = await Promise.all([
      supabase.from('blocked_users').select('id', { count: 'exact', head: true }).eq('blocker_id', user.id),
      supabase.from('consent_log').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('consent_log').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('action_type', 'consent_revoked'),
    ])

    return NextResponse.json({
      data: {
        blockedCount: blockedRes.count || 0,
        recentConsentActions: consentRes.count || 0,
        hasActiveConsent: (revokedRes.count || 0) === 0,
      },
    })
  } catch (err) {
    logger.error('Safety summary GET error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
