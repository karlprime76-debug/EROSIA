import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password, name, age } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email, password, email_confirm: false,
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message ?? 'Inscription échouée' }, { status: 400 })
    }

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
