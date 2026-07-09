import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const targetUserIds: string[] = body.targetUserIds
    if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      return NextResponse.json({ error: 'targetUserIds requis' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('get_privacy_check_data', { target_user_ids: targetUserIds })

    if (error) {
      logger.error('Privacy check RPC error', { error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    logger.error('Privacy check POST error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('privacy_settings')
      .select('user_id')
      .eq('visible_to_compatible_only', true)

    if (error) {
      logger.error('Privacy visible_to_compatible_only error', { error: error.message })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data?.map(r => r.user_id) ?? [] })
  } catch (err) {
    logger.error('Privacy check GET error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
