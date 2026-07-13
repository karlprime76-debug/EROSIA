const BASE = (process.env.PAYDUNYA_MODE ?? 'test') === 'live'
  ? 'https://app.paydunya.com/api/v1'
  : 'https://app.paydunya-sandbox.com/api/v1'

function headers() {
  const masterKey = process.env.PAYDUNYA_MASTER_KEY
  const privateKey = process.env.PAYDUNYA_PRIVATE_KEY
  const token = process.env.PAYDUNYA_TOKEN
  if (!masterKey || !privateKey || !token) {
    throw new Error('PayDunya : clés API manquantes dans les variables d\'environnement')
  }
  return {
    'Content-Type': 'application/json',
    'PAYDUNYA-MASTER-KEY': masterKey,
    'PAYDUNYA-PRIVATE-KEY': privateKey,
    'PAYDUNYA-TOKEN': token,
  }
}

async function safeJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`PayDunya HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

async function fetchWithTimeout(url: string, options: RequestInit & { timeout?: number } = {}) {
  const { timeout = 15000, ...fetchOptions } = options
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { ...fetchOptions, signal: controller.signal })
    return res
  } finally {
    clearTimeout(id)
  }
}

export async function createInvoice(amount: string, description: string, customData: Record<string, string>, cancelUrl: string, returnUrl: string, callbackUrl?: string) {
  const res = await fetchWithTimeout(`${BASE}/checkout-invoice/create`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      invoice: {
        items: [{ name: description, quantity: 1, unit_price: amount, total_price: amount }],
        total_amount: amount, description, custom_data: customData,
      },
      store: { name: 'Erosia' },
      actions: {
        cancel_url: cancelUrl,
        return_url: returnUrl,
        ...(callbackUrl && { callback_url: callbackUrl }),
      },
    }),
  })
  return safeJson<{ status: string; response_text?: string; token?: string }>(res)
}

export async function confirmInvoice(invoiceToken: string) {
  const res = await fetchWithTimeout(`${BASE}/checkout-invoice/confirm/${invoiceToken}`, {
    headers: headers(),
  })
  return safeJson<{ status: string; invoice?: { status: string; custom_data?: Record<string, string> }; customer?: Record<string, string> }>(res)
}

/**
 * Send a payment request directly to a mobile money phone number (no redirect).
 * Requires OPR (Operateur) access enabled on the PayDunya account.
 */
export async function sendMobileMoneyPayment(
  invoiceToken: string,
  phone: string,
  operator: string,
  customerName?: string,
) {
  const res = await fetchWithTimeout(`${BASE}/opr/create`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      invoice_token: invoiceToken,
      customer_phone: phone,
      customer_name: customerName ?? 'Client Erosia',
      operator,
    }),
  })
  return safeJson<{ status: string; response_text?: string; token?: string }>(res)
}
