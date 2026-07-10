const DIDIT_API_BASE = 'https://verification.didit.me/v3'

function getDiditKey(): string {
  const key = process.env.DIDIT_API_KEY
  if (!key) throw new Error('DIDIT_API_KEY not configured')
  return key
}

function getWebhookSecret(): string {
  const secret = process.env.DIDIT_WEBHOOK_SECRET
  if (!secret) throw new Error('DIDIT_WEBHOOK_SECRET not configured')
  return secret
}

interface DiditSessionResponse {
  session_id: string
  session_number: number
  status: string
  workflow_id: string
  url: string
  vendor_data: string | null
}

interface DiditDecision {
  id_verifications?: Array<{ node_id: string; status: string; first_name?: string; last_name?: string }>
  liveness_checks?: Array<{ node_id: string; status: string; score: number }>
  face_matches?: Array<{ node_id: string; status: string; score: number }>
  aml_screenings?: Array<{ node_id: string; status: string; total_hits: number }>
}

export interface DiditWebhookPayload {
  event_id: string
  webhook_type: string
  timestamp: number
  created_at: number
  application_id: string
  environment: 'live' | 'sandbox'
  session_id: string
  status: string
  workflow_id: string
  workflow_version: number
  vendor_data: string | null
  metadata: Record<string, unknown>
  decision: DiditDecision
}

async function diditFetch(path: string, options: RequestInit = {}) {
  const url = `${DIDIT_API_BASE}${path}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': getDiditKey(),
        ...options.headers,
      },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Didit API error ${res.status}: ${text}`)
    }
    return res.json()
  } finally {
    clearTimeout(timeout)
  }
}

export async function createVerificationSession(vendorData: string, callbackUrl: string): Promise<{ sessionId: string; url: string }> {
  const workflowId = process.env.DIDIT_WORKFLOW_ID
  if (!workflowId) throw new Error('DIDIT_WORKFLOW_ID not configured')
  let data: DiditSessionResponse
  try {
    data = await diditFetch('/session/', {
      method: 'POST',
      body: JSON.stringify({
        workflow_id: workflowId,
        vendor_data: vendorData,
        callback: callbackUrl,
        language: 'fr',
      }),
    })
  } catch (err) {
    throw new Error(`Didit session creation failed: ${err instanceof Error ? err.message : String(err)}`)
  }
  return { sessionId: data.session_id, url: data.url }
}

export async function getSessionDecision(sessionId: string): Promise<{ status: string; decision: DiditDecision }> {
  const data = await diditFetch(`/session/${sessionId}/decision/`)
  return { status: data.status as string, decision: data.decision as DiditDecision }
}

export async function verifyWebhookSignature(payload: string, signature: string, timestamp: string): Promise<boolean> {
  const ts = parseInt(timestamp, 10)
  const whSecret = getWebhookSecret()
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false
  const encoder = new TextEncoder()
  const keyBuf = encoder.encode(whSecret).buffer as ArrayBuffer
  const key = await crypto.subtle.importKey('raw', keyBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  const sigBuf = hexToBytes(signature).buffer as ArrayBuffer
  const msgBuf = encoder.encode(payload).buffer as ArrayBuffer
  return crypto.subtle.verify('HMAC', key, sigBuf, msgBuf)
}

function hexToBytes(hex: string): Uint8Array {
  if (!/^[0-9a-fA-F]+$/.test(hex)) throw new Error('Invalid hex string: non-hex characters')
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string length')
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  return bytes
}
