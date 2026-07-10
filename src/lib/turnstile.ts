import { logger } from './logger'

export async function verifyTurnstile(token: string): Promise<{ ok: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return { ok: true }
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    })
    const data = await res.json()
    if (data.success === true) return { ok: true }
    logger.error('Turnstile verification failed', { errorCodes: data['error-codes'] })
    return { ok: false, error: data['error-codes']?.[0] ?? 'Échec de validation Turnstile' }
  } catch (err) {
    logger.error('Turnstile network error', { error: String(err) })
    return { ok: false, error: `Erreur réseau Turnstile: ${String(err)}` }
  }
}

export function isTurnstileConfigured(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
}

export function turnstileGuard(token: string | undefined): boolean {
  return isTurnstileConfigured() && token !== '__skip__'
}
