import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '30')))
    const action = searchParams.get('action') ?? 'all'
    const offset = (page - 1) * limit

    const admin = createAdminClient()
    let query = admin
      .from('admin_activity_log')
      .select('*, admin:profiles!admin_activity_log_admin_id_fkey(id, name, email)', { count: 'exact' })

    if (action !== 'all') query = query.eq('action', action)

    const { data, count, error } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    if (error) {
      logger.error('Admin activity GET error', { error: error.message })
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    const { data: actions } = await admin.from('admin_activity_log').select('action', { count: 'exact', head: false })

    return NextResponse.json({
      logs: data ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
      actionTypes: [...new Set((actions ?? []).map(a => a.action))],
    })
  } catch (err) {
    logger.error('Admin activity GET exception', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
