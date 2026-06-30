import type { SafetyTip, ConsentLogEntry, ConsentActionType, BlockedUser, ReportPayload, SafetySummary } from './types'

const BASE = '/api/safety'

export async function logConsent(
  userId: string,
  actionType: ConsentActionType,
  targetUserId?: string,
  metadata?: Record<string, unknown>,
): Promise<{ error?: string }> {
  const res = await fetch(`${BASE}/consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, action_type: actionType, target_user_id: targetUserId, metadata }),
  })
  if (!res.ok) return { error: 'Impossible de journaliser cette action' }
  return {}
}

export async function getConsentLog(userId: string): Promise<{ data?: ConsentLogEntry[]; error?: string }> {
  const res = await fetch(`${BASE}/consent?userId=${encodeURIComponent(userId)}`)
  if (!res.ok) return { error: 'Impossible de récupérer l historique' }
  const data = await res.json()
  return { data }
}

export async function revokeConsent(userId: string): Promise<{ error?: string }> {
  const res = await fetch(`${BASE}/consent`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
  if (!res.ok) return { error: 'Impossible de retirer le consentement' }
  return {}
}

export async function reportUser(payload: ReportPayload): Promise<{ error?: string }> {
  const res = await fetch(`${BASE}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) return { error: 'Impossible de soumettre le signalement' }
  return {}
}

export async function blockUser(blockedId: string): Promise<{ error?: string }> {
  const res = await fetch(`${BASE}/block`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocked_id: blockedId }),
  })
  if (!res.ok) return { error: 'Impossible de bloquer cet utilisateur' }
  return {}
}

export async function unblockUser(blockedId: string): Promise<{ error?: string }> {
  const res = await fetch(`${BASE}/block`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocked_id: blockedId }),
  })
  if (!res.ok) return { error: 'Impossible de débloquer cet utilisateur' }
  return {}
}

export async function getBlockedUsers(): Promise<{ data?: BlockedUser[]; error?: string }> {
  const res = await fetch(`${BASE}/blocked`)
  if (!res.ok) return { error: 'Impossible de récupérer la liste des utilisateurs bloqués' }
  return await res.json()
}

export async function isUserBlocked(blockedId: string): Promise<{ blocked: boolean; error?: string }> {
  const res = await fetch(`${BASE}/block/check?blockedId=${encodeURIComponent(blockedId)}`)
  if (!res.ok) return { blocked: false, error: 'Erreur de vérification' }
  return await res.json()
}

export async function getSafetyTips(category?: string): Promise<{ data?: SafetyTip[]; error?: string }> {
  const params = category ? `?category=${encodeURIComponent(category)}` : ''
  const res = await fetch(`${BASE}/tips${params}`)
  if (!res.ok) return { error: 'Impossible de récupérer les conseils' }
  return await res.json()
}

export async function getSafetySummary(): Promise<{ data?: SafetySummary; error?: string }> {
  const res = await fetch(`${BASE}/summary`)
  if (!res.ok) return { error: 'Impossible de récupérer le résumé' }
  return await res.json()
}
