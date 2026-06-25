const BASE = 'https://app.paydunya.com/api/v1'

function headers() {
  return {
    'Content-Type': 'application/json',
    'PAYDUNYA-MASTER-KEY': process.env.PAYDUNYA_MASTER_KEY!,
    'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY!,
    'PAYDUNYA-TOKEN': process.env.PAYDUNYA_TOKEN!,
  }
}

export function getPayDunyaHeaders() {
  return headers()
}

export async function createInvoice(amount: string, description: string, customData: Record<string, string>, cancelUrl: string, returnUrl: string) {
  const res = await fetch(`${BASE}/checkout-invoice/create`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      invoice: { total_amount: amount, description, custom_data: customData },
      store: { name: 'Erosia' },
      actions: { cancel_url: cancelUrl, return_url: returnUrl },
    }),
  })
  return res.json() as Promise<{ status: string; response_text?: string; token?: string }>
}

export async function confirmInvoice(invoiceToken: string) {
  const res = await fetch(`${BASE}/checkout-invoice/confirm/${invoiceToken}`, {
    headers: headers(),
  })
  return res.json() as Promise<{ status: string; invoice?: { status: string }; customer?: Record<string, string> }>
}
