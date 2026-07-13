import type { SafetyTip, ConsentLogEntry, ConsentActionType, BlockedUser, ReportPayload, SafetySummary } from './types'
import { logger } from '@/lib/logger'

const BASE = '/api/safety'

async function safeFetch<T>(url: string, options?: RequestInit): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(url, options)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { error: body.error || `Erreur ${res.status}` }
    }
    return await res.json() as { data?: T; error?: string }
  } catch (err) {
    logger.error('Safety API error', { url, error: String(err) })
    return { error: 'Erreur réseau. Vérifie ta connexion.' }
  }
}

export async function logConsent(
  userId: string,
  actionType: ConsentActionType,
  targetUserId?: string,
  metadata?: Record<string, unknown>,
): Promise<{ error?: string }> {
  return safeFetch(`${BASE}/consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, action_type: actionType, target_user_id: targetUserId, metadata }),
  })
}

export async function getConsentLog(userId: string): Promise<{ data?: ConsentLogEntry[]; error?: string }> {
  return safeFetch(`${BASE}/consent?userId=${encodeURIComponent(userId)}`)
}

export async function revokeConsent(userId: string): Promise<{ error?: string }> {
  return safeFetch(`${BASE}/consent`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
}

export async function reportUser(payload: ReportPayload): Promise<{ error?: string }> {
  return safeFetch(`${BASE}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function blockUser(blockedId: string): Promise<{ error?: string }> {
  return safeFetch(`${BASE}/block`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocked_id: blockedId }),
  })
}

export async function unblockUser(blockedId: string): Promise<{ error?: string }> {
  return safeFetch(`${BASE}/block`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocked_id: blockedId }),
  })
}

export async function getBlockedUsers(): Promise<{ data?: BlockedUser[]; error?: string }> {
  return safeFetch(`${BASE}/blocked`)
}

export async function isUserBlocked(blockedId: string): Promise<{ blocked: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE}/block/check?blockedId=${encodeURIComponent(blockedId)}`)
    if (!res.ok) return { blocked: false, error: 'Erreur de vérification' }
    return await res.json()
  } catch (err) {
    logger.error('Safety API error', { url: `${BASE}/block/check`, error: String(err) })
    return { blocked: false, error: 'Erreur réseau. Vérifie ta connexion.' }
  }
}

export async function getSafetyTips(category?: string): Promise<{ data?: SafetyTip[]; error?: string }> {
  const params = category ? `?category=${encodeURIComponent(category)}` : ''
  return safeFetch(`${BASE}/tips${params}`)
}

export async function getSafetySummary(): Promise<{ data?: SafetySummary; error?: string }> {
  return safeFetch(`${BASE}/summary`)
}
