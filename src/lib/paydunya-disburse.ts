function getPaydunyaMasterKey(): string {
  const key = process.env.PAYDUNYA_MASTER_KEY
  if (!key) throw new Error('PAYDUNYA_MASTER_KEY not configured')
  return key
}

function getPaydunyaPrivateKey(): string {
  const key = process.env.PAYDUNYA_PRIVATE_KEY
  if (!key) throw new Error('PAYDUNYA_PRIVATE_KEY not configured')
  return key
}

function getPaydunyaToken(): string {
  const token = process.env.PAYDUNYA_TOKEN
  if (!token) throw new Error('PAYDUNYA_TOKEN not configured')
  return token
}

const BASE = (process.env.PAYDUNYA_MODE ?? 'test') === 'live'
  ? 'https://app.paydunya.com/api/v2'
  : 'https://app.paydunya-sandbox.com/api/v2'

function headers() {
  return {
    'Content-Type': 'application/json',
    'PAYDUNYA-MASTER-KEY': getPaydunyaMasterKey(),
    'PAYDUNYA-PRIVATE-KEY': getPaydunyaPrivateKey(),
    'PAYDUNYA-TOKEN': getPaydunyaToken(),
  }
}

const COUNTRY_OPERATOR_MAP: Record<string, Record<string, string>> = {
  SN: { 'Orange Money': 'orange-money-senegal', 'Wave': 'wave-senegal', 'Free Money': 'free-money-senegal' },
  CI: { 'Orange Money': 'orange-money-ci', 'MTN Mobile Money': 'mtn-ci', 'Moov Money': 'moov-ci', 'Wave': 'wave-ci' },
  ML: { 'Orange Money': 'orange-money-mali', 'Moov Money': 'moov-ml' },
  BF: { 'Orange Money': 'orange-money-burkina', 'Moov Money': 'moov-burkina-faso' },
  TG: { 'Orange Money': 'orange-money-togo', 'Moov Money': 'moov-togo' },
  BJ: { 'Orange Money': 'orange-money-benin', 'MTN Mobile Money': 'mtn-benin', 'Moov Money': 'moov-benin' },
  CM: { 'Orange Money': 'orange-money-cameroun', 'MTN Mobile Money': 'mtn-cameroun' },
}

export function getWithdrawMode(country: string, operator: string): string | null {
  return COUNTRY_OPERATOR_MAP[country]?.[operator] ?? null
}

export function extractPhoneAlias(phone: string): string {
  return phone.replace(/[^0-9]/g, '').replace(/^(?:00?)?(?:221|225|223|226|228|229|237)/, '')
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

export async function createDisburseInvoice(accountAlias: string, amountXof: number, withdrawMode: string, callbackUrl: string) {
  const res = await fetchWithTimeout(`${BASE}/disburse/create-invoice`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      account_alias: accountAlias,
      amount: amountXof,
      withdraw_mode: withdrawMode,
      callback_url: callbackUrl,
    }),
  })
  return safeJson<{ response_code?: string; response_text?: string; token?: string; status?: string }>(res)
}

export async function submitDisburseInvoice(disburseInvoice: string, disburseId?: string) {
  const body: Record<string, string> = { disburse_invoice: disburseInvoice }
  if (disburseId) body.disburse_id = disburseId
  const res = await fetchWithTimeout(`${BASE}/disburse/submit-invoice`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  return safeJson<{ response_code?: string; response_text?: string; status?: string }>(res)
}

export async function checkDisburseStatus(token: string) {
  const res = await fetchWithTimeout(`${BASE}/disburse/check-status/${token}`, {
    headers: headers(),
  })
  return safeJson<{ response_code?: string; status?: string; response_text?: string }>(res)
}
