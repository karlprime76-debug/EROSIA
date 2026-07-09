import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_PRIVACY } from '@/lib/privacy'
import type { PrivacySettings } from '@/lib/privacy'
import { logger } from '@/lib/logger'
import { updatePrivacySchema } from '@/lib/validations'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data, error } = await supabase.from('privacy_settings').select('*').eq('user_id', user.id).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data) {
      const { error: insError } = await supabase.from('privacy_settings').insert({ user_id: user.id })
      if (insError) return NextResponse.json({ error: insError.message }, { status: 400 })
      return NextResponse.json({ settings: DEFAULT_PRIVACY }, {
        headers: { 'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60' },
      })
    }

    return NextResponse.json({ settings: data as PrivacySettings }, {
      headers: { 'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60' },
    })
  } catch (err) {
    logger.error('Privacy GET error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json()
    const parsed = updatePrivacySchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'Données invalides'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) updates[key] = value
    }
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Aucune mise à jour' }, { status: 400 })

    const { error } = await supabase.from('privacy_settings').upsert({
      user_id: user.id,
      ...updates,
      updated_at: new Date().toISOString(),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('Privacy PUT error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
