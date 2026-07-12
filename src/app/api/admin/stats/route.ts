import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const admin = createAdminClient()
    const now = new Date()
    const d24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const d7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const { count: newUsers24h } = await admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', d24h)
    const { count: activeUsers7d } = await admin.from('profiles').select('*', { count: 'exact', head: true }).gte('last_active', d7d)
    const { count: onlineNow } = await admin.from('profiles').select('*', { count: 'exact', head: true }).gte('last_active', new Date(now.getTime() - 5 * 60 * 1000).toISOString())
    const { count: matchesCreated24h } = await admin.from('matches').select('*', { count: 'exact', head: true }).gte('created_at', d24h)
    const { count: activeConversations } = await admin.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', d7d)
    const { count: storiesPosted24h } = await admin.from('stories').select('*', { count: 'exact', head: true }).gte('created_at', d24h)
    const { count: eventsCreated24h } = await admin.from('events').select('*', { count: 'exact', head: true }).gte('created_at', d24h)
    const { count: reportsPending } = await admin.from('moderation_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    const { count: verificationsPending } = await admin.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    const { count: allUsers } = await admin.from('profiles').select('*', { count: 'exact', head: true })

    const { data: premiumCount } = await admin.from('profiles').select('id', { count: 'exact', head: false }).eq('subscription_tier', 'premium').not('subscription_end', 'lt', now.toISOString())
    const premiumSubs = premiumCount?.length ?? 0

    const { data: revenueData } = await admin.from('gift_transactions').select('amount_cents').eq('type', 'purchase').gte('created_at', startOfMonth)
    const revenueMonth = (revenueData ?? []).reduce((sum, t) => sum + (t.amount_cents ?? 0), 0)

    const { data: previousMonthData } = await admin.from('profiles').select('*', { count: 'exact', head: false }).lt('created_at', d7d)
    const prevUsers = previousMonthData?.length ?? 0
    const retentionRate = prevUsers > 0 ? Math.round((activeUsers7d ?? 0) / prevUsers * 100) : 100

    const userGrowth: Array<{ date: string; count: number }> = []
    const dailyActive: Array<{ date: string; count: number }> = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i).toISOString()
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1).toISOString()
      const dateStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

      const { count: regs } = await admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', dayStart).lt('created_at', dayEnd)
      userGrowth.push({ date: dateStr, count: regs ?? 0 })

      const { count: actives } = await admin.from('profiles').select('*', { count: 'exact', head: true }).gte('last_active', dayStart).lt('last_active', dayEnd)
      dailyActive.push({ date: dateStr, count: actives ?? 0 })
    }

    return NextResponse.json({
      newUsers24h: newUsers24h ?? 0,
      activeUsers7d: activeUsers7d ?? 0,
      onlineNow: onlineNow ?? 0,
      matchesCreated24h: matchesCreated24h ?? 0,
      activeConversations: activeConversations ?? 0,
      storiesPosted24h: storiesPosted24h ?? 0,
      eventsCreated24h: eventsCreated24h ?? 0,
      reportsPending: reportsPending ?? 0,
      verificationsPending: verificationsPending ?? 0,
      premiumSubs,
      revenueMonth,
      retentionRate,
      userGrowth,
      dailyActive,
      totalUsers: allUsers ?? 0,
    })
  } catch (err) {
    logger.error('Admin stats error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
