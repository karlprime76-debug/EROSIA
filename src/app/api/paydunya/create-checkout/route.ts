import { createInvoice } from '@/lib/paydunya'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { createCheckoutSchema } from '@/lib/validations'
import { apiResponse, apiError, apiServerError } from '@/lib/api-response'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Not authenticated', 401)

    let body: Record<string, unknown>
    try { body = await request.json() } catch {
      return apiError('Corps de requête invalide', 400)
    }
    const parsed = createCheckoutSchema.safeParse(body)
    const plan: string = parsed.success ? (parsed.data.plan ?? 'monthly') : 'monthly'

    const amount = plan === 'yearly' ? '50000' : '5000'
    const desc = plan === 'yearly' ? 'Abonnement Premium Erosia - 1 an' : 'Abonnement Premium Erosia - 1 mois'

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    if (!siteUrl) return apiError('Erreur de configuration serveur', 500)

    let result: { status: string; response_text?: string; token?: string }
    try {
      result = await createInvoice(
        amount,
        desc,
        { user_id: user.id, plan },
        `${siteUrl}/settings`,
        `${siteUrl}/settings?premium=success`,
        `${siteUrl}/api/paydunya/webhook`,
      )
    } catch (err) {
      logger.error('PayDunya createInvoice error', { error: String(err) })
      return apiError('Erreur de communication avec PayDunya', 502)
    }

    // PayDunya renvoie parfois l'URL dans response_text au lieu du champ token
    if ((result.status !== 'success' || !result.token) && result.response_text?.startsWith('https://payment.')) {
      return apiResponse({ url: result.response_text })
    }
    if (result.status !== 'success' || !result.token) {
      logger.error('create-checkout: PayDunya non-success', { status: result.status, response_text: result.response_text })
      return apiError('Échec de la création du paiement. Contacte le support si le problème persiste.', 500)
    }

    const paydunyaHost = (process.env.PAYDUNYA_MODE ?? 'test') === 'live' ? 'payment.paydunya.com' : 'payment.paydunya-sandbox.com'
    const paymentUrl = `https://${paydunyaHost}/payment/${result.token}`

    return apiResponse({ url: paymentUrl })
  } catch (err) {
    return apiServerError(err)
  }
}
