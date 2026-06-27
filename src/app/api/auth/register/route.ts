import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password, name, age } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }
    if (!age || typeof age !== 'number' || age < 18 || age > 120) {
      return NextResponse.json({ error: 'Âge invalide. Tu dois avoir au moins 18 ans.' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, password,
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message ?? 'Inscription échouée' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error: profileError } = await admin.from('profiles').insert({
      id: authData.user.id, name, age, photos: [], interests: [],
    })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
