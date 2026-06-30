export interface SafetyTip {
  id: string
  category: 'dating' | 'privacy' | 'security' | 'consent'
  icon: string
  title: string
  content: string
  priority: number
}

export interface ConsentLogEntry {
  id: string
  user_id: string
  action_type: ConsentActionType
  target_user_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type ConsentActionType =
  | 'share_photo'
  | 'share_location'
  | 'share_contact'
  | 'consent_granted'
  | 'consent_revoked'
  | 'report_submitted'
  | 'user_blocked'
  | 'user_unblocked'
  | 'sensitive_info_warning_viewed'

export interface BlockedUser {
  id: string
  blocked_id: string
  name: string
  photo: string | null
  created_at: string
}

export interface ReportPayload {
  reported_id: string
  reason: string
  description?: string
  match_id?: string
  message_id?: string
}

export interface SafetySummary {
  blockedCount: number
  recentConsentActions: number
  hasActiveConsent: boolean
}
