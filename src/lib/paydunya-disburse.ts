const BASE = 'https://app.paydunya.com/api/v2'

function headers() {
  return {
    'Content-Type': 'application/json',
    'PAYDUNYA-MASTER-KEY': process.env.PAYDUNYA_MASTER_KEY!,
    'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY!,
    'PAYDUNYA-TOKEN': process.env.PAYDUNYA_TOKEN!,
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
  return phone.replace(/[^0-9]/g, '').replace(/^00?(?:221|225|223|226|228|229|237)?/, '')
}

export async function createDisburseInvoice(accountAlias: string, amountXof: number, withdrawMode: string, callbackUrl: string) {
  const res = await fetch(`${BASE}/disburse/create-invoice`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      account_alias: accountAlias,
      amount: amountXof,
      withdraw_mode: withdrawMode,
      callback_url: callbackUrl,
    }),
  })
  return res.json() as Promise<{ response_code?: string; response_text?: string; token?: string; status?: string }>
}

export async function submitDisburseInvoice(disburseInvoice: string, disburseId?: string) {
  const body: Record<string, string> = { disburse_invoice: disburseInvoice }
  if (disburseId) body.disburse_id = disburseId
  const res = await fetch(`${BASE}/disburse/submit-invoice`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })
  return res.json() as Promise<{ response_code?: string; response_text?: string; status?: string }>
}

export async function checkDisburseStatus(token: string) {
  const res = await fetch(`${BASE}/disburse/check-status/${token}`, {
    headers: headers(),
  })
  return res.json() as Promise<{ response_code?: string; status?: string; response_text?: string }>
}
