import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorDesc = searchParams.get('error_description')
    const ALLOWED_REDIRECTS = ['/onboarding', '/discover', '/matches', '/settings', '/profile', '/island', '/chat']
    const nextParam = searchParams.get('next')
    const next = nextParam && ALLOWED_REDIRECTS.includes(nextParam) ? nextParam : '/onboarding'

    if (error) {
      logger.warn('OAuth callback error', { error, description: errorDesc })
      return NextResponse.redirect(`${origin}/login?error=oauth_denied`)
    }

    if (code) {
      const supabase = await createClient()
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (exchangeError) {
        logger.error('OAuth code exchange failed', { error: exchangeError.message })
        return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }

    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
  } catch (err) {
    logger.error('Auth callback exception', { error: String(err) })
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
  }
}
