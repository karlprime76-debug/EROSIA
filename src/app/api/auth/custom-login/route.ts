import { createAdminClient } from '@/lib/supabase/admin'
import { signToken } from '@/lib/custom-auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: userId, error } = await admin.rpc('verify_password', {
      p_email: email,
      p_password: password,
    })

    if (error || !userId) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
    }

    const token = await signToken(userId as string, email)
    const response = NextResponse.json({ ok: true })
    response.cookies.set('custom_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 604800,
    })

    return response
  } catch (err) {
    console.error('Custom login error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
