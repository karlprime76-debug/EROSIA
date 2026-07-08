import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: blockedRows, error } = await supabase
      .from('blocked_users')
      .select('id, blocked_id, created_at')
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!blockedRows || blockedRows.length === 0) return NextResponse.json({ data: [] })

    const blockedIds = blockedRows.map(r => r.blocked_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, photo')
      .in('id', blockedIds)

    const profileMap = new Map((profiles || []).map(p => [p.id, p]))

    const result = blockedRows.map(r => ({
      id: r.id,
      blocked_id: r.blocked_id,
      name: (profileMap.get(r.blocked_id) as { name?: string } | undefined)?.name || 'Utilisateur inconnu',
      photo: (profileMap.get(r.blocked_id) as { photo?: string | null } | undefined)?.photo || null,
      created_at: r.created_at,
    }))

    return NextResponse.json({ data: result }, {
      headers: { 'Cache-Control': 'private, s-maxage=15, stale-while-revalidate=30' },
    })
  } catch (err) {
    logger.error('Blocked list GET error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
