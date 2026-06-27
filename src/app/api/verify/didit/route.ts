import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createVerificationSession } from '@/lib/didit'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.headers.get('origin') ?? 'https://erosia-jet.vercel.app'
    const callbackUrl = `${siteUrl}/api/verify/webhook`

    const { sessionId, url } = await createVerificationSession(user.id, callbackUrl)

    const { error: insertError } = await supabase
      .from('verification_requests')
      .insert({
        user_id: user.id,
        didit_session_id: sessionId,
        status: 'pending',
      })

    if (insertError) {
      logger.error('Failed to save verification request', { error: insertError.message, userId: user.id, sessionId })
      return NextResponse.json({ error: 'Erreur lors de la création de la demande' }, { status: 500 })
    }

    return NextResponse.json({ url, sessionId })
  } catch (err) {
    logger.error('Didit session creation error', { error: String(err) })
    return NextResponse.json({ error: 'Erreur de vérification' }, { status: 500 })
  }
}
