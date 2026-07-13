import { supabase as sbClient } from '../supabase/client'
import type { PostgrestMaybeSingleResponse } from '@supabase/supabase-js'
import type { BehaviorAction } from '../engine/types'
import { sanitize } from '../sanitize'
import { validateFile, sanitizeFilename } from '../media'
import { logger } from '../logger'

import type { Profile, Swipe, Match, Message, ProfileFilters } from './types'
export type { LookingFor, Mood, Gender, Profile, Swipe, Match, Message, BlockedProfile, ProfileFilters, GiftTransaction } from './types'

export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase().auth.getUser()
  return user?.id ?? null
}

function supabase() {
  return sbClient
}

async function assertMatchParticipant(matchId: string): Promise<{ userId?: string; error?: string }> {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated' }
  const { data } = await supabase().from('matches').select('user1_id,user2_id').eq('id', matchId).maybeSingle()
  if (!data) return { error: 'Match introuvable' }
  if (data.user1_id !== userId && data.user2_id !== userId) return { error: 'Non autorisé' }
  return { userId }
}

const PUBLIC_PROFILE_FIELDS = 'id, name, age, bio, occupation, location, photos, interests, is_verified, looking_for, created_at, gender, interested_in, mood'

async function attachScoresAndMood(profiles: Record<string, unknown>[] | null): Promise<Profile[] | null> {
  if (!profiles || profiles.length === 0) return profiles as Profile[] | null
  const ids = profiles.map(p => p.id)
  const { data: scores } = await supabase().from('user_scores').select('user_id, energy_score, trust_score').in('user_id', ids)
  const scoresMap = new Map(scores?.map(s => [s.user_id, s]) ?? [])
  return profiles.map(p => {
    const s = scoresMap.get(p.id)
    return {
      ...p,
      energy_score: s?.energy_score ? Math.round(s.energy_score * 100) : 50,
      trust_score: s?.trust_score ? Math.round(s.trust_score * 100) : 50,
      mood: p.mood,
    } as Profile
  })
}

export async function getProfiles(excludeIds: string[], filters?: { minAge?: number; maxAge?: number; lookingFor?: string; showIncognito?: boolean }) {
  let q = supabase().from('profiles').select(PUBLIC_PROFILE_FIELDS)
  q = q.eq('onboarding_complete', true)
  q = q.eq('profile_visible', true)
  if (excludeIds.length > 0) q = q.not('id', 'in', `(${excludeIds.join(',')})`)
  if (filters?.minAge) q = q.gte('age', filters.minAge)
  if (filters?.maxAge) q = q.lte('age', filters.maxAge)
  if (filters?.lookingFor) q = q.eq('looking_for', filters.lookingFor)
  if (!filters?.showIncognito) q = q.eq('incognito', false)
  const { data, error } = await q
  const attached = await attachScoresAndMood(data)
  return { data: attached, error: error?.message }
}

export async function getProfile(id: string): Promise<{ data: Profile | null; error: string | null }> {
  const { data } = await supabase().from('profiles').select(PUBLIC_PROFILE_FIELDS).eq('id', id).maybeSingle()
  if (!data) return { data: null, error: 'Profil introuvable' }
  const attached = await attachScoresAndMood([data])
  return { data: attached?.[0] ?? null, error: null }
}

export async function updateProfile(id: string, updates: Partial<Profile>) {
  logger.debug('updateProfile: début', { id, updates })
  const userId = await getCurrentUserId()
  if (!userId) { logger.warn('updateProfile: non authentifié'); return { error: 'Not authenticated' } }
  if (userId !== id) { logger.warn('updateProfile: accès non autorisé', { userId: userId, profileId: id }); return { error: 'Non autorisé' } }
  const sanitized = { ...updates }
  if (typeof sanitized.bio === 'string') sanitized.bio = sanitize(sanitized.bio, 500)
  if (typeof sanitized.name === 'string') sanitized.name = sanitize(sanitized.name, 80)
  if (typeof sanitized.occupation === 'string') sanitized.occupation = sanitize(sanitized.occupation, 100)
  if (typeof sanitized.location === 'string') sanitized.location = sanitize(sanitized.location, 100)
  logger.debug('updateProfile: appel Supabase', { sanitized, id })
  const { data, error } = await supabase().from('profiles').update(sanitized).eq('id', id).select().maybeSingle()
  if (error) { logger.error('updateProfile: erreur Supabase', error); return { error: error.message } }
  if (!data) { logger.warn('updateProfile: données nulles après update (possible RLS)', { id }); return { error: 'Impossible de mettre à jour le profil. Vérifie que tu es bien connecté et réessaie.' } }
  logger.debug('updateProfile: succès', data)
  return { data }
}

export async function createSwipe(swipedId: string, direction: Swipe['direction']) {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated' }
  if (swipedId === userId) return { error: 'Vous ne pouvez pas swiper sur vous-même' }
  const { tier } = await getSubscriptionStatus()
  if (tier !== 'premium') {
    const { count } = await supabase()
      .from('swipes').select('*', { count: 'exact', head: true })
      .eq('swiper_id', userId)
      .gte('created_at', (() => { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString() })())
    if ((count ?? 0) >= 20) return { error: 'Limite de swipe atteinte' }
  }
  const { data, error } = await supabase().from('swipes').insert({
    swiper_id: userId, swiped_id: swipedId, direction,
  }).select().single()
  return { data: data as Swipe | null, error: error?.message }
}

export async function getSwipedIds(): Promise<string[]> {
  const userId = await getCurrentUserId()
  if (!userId) return []
  const { data, error } = await supabase().from('swipes').select('swiped_id').eq('swiper_id', userId).limit(100)
  if (error) return []
  return (data ?? []).map(s => s.swiped_id)
}

export async function getMatches(page = 0, pageSize = 50): Promise<{ data: Match[] | null; error?: string }> {
  const userId = await getCurrentUserId()
  if (!userId) return { data: null, error: 'Not authenticated' }
  const from = page * pageSize
  const to = from + pageSize - 1
  const { data, error } = await supabase()
    .from('matches').select('*')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .range(from, to)
  return { data: data as Match[] | null, error: error?.message }
}

export async function checkForMatch(targetId: string): Promise<{ isMatch: boolean; match: Match | null }> {
  const userId = await getCurrentUserId()
  if (!userId) return { isMatch: false, match: null }
  const { data, error } = await supabase().from('matches').select('*')
    .or(`and(user1_id.eq.${userId},user2_id.eq.${targetId}),and(user1_id.eq.${targetId},user2_id.eq.${userId})`)
    .maybeSingle() as PostgrestMaybeSingleResponse<Match>
  if (error || !data) return { isMatch: false, match: null }
  return { isMatch: true, match: data }
}

export async function getMessages(matchId: string): Promise<{ data: Message[] | null; error?: string }> {
  const { error: authErr } = await assertMatchParticipant(matchId)
  if (authErr) return { data: null, error: authErr }
  const { data, error } = await supabase()
    .from('messages').select('*').eq('match_id', matchId).order('created_at', { ascending: true })
  return { data: data as Message[] | null, error: error?.message }
}

export async function sendMessage(matchId: string, text: string) {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, text }),
      signal: ctrl.signal,
    })
    clearTimeout(t)
    const data = await res.json()
    if (!res.ok) return { error: data.error ?? "Erreur lors de l'envoi" }
    return { data: data.data as Message }
  } catch (err) {
    logger.error('sendMessage error', { error: String(err) })
    return { error: 'Erreur réseau' }
  }
}

export async function uploadPhoto(uri: File) {
  const formData = new FormData()
  formData.append('file', uri)
  try {
    const res = await fetch('/api/profile/photos', { method: 'POST', body: formData })
    const data = await res.json()
    if (!res.ok) return { error: data.error ?? "Erreur lors de l'upload" }
    return { url: data.url, photos: data.photos }
  } catch {
    return { error: 'Erreur réseau' }
  }
}

export async function deletePhoto(photoUrl: string) {
  try {
    const res = await fetch('/api/profile/photos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrl }),
    })
    const data = await res.json()
    if (!res.ok) return { photos: null as unknown as string[], error: data.error ?? 'Erreur lors de la suppression' }
    return { photos: data.photos, error: undefined }
  } catch {
    return { error: 'Erreur réseau' }
  }
}

export async function setPrimaryPhoto(photoUrl: string) {
  try {
    const res = await fetch('/api/profile/photos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrl, action: 'set-primary' }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error ?? 'Erreur lors du changement de photo principale' }
    return { photos: data.photos, error: undefined }
  } catch {
    return { error: 'Erreur réseau' }
  }
}

export async function sendFlirt(receiverId: string) {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated' }
  if (receiverId === userId) return { error: 'Vous ne pouvez pas vous envoyer un clin d\'œil' }
  const { error } = await supabase().from('flirts').insert({
    sender_id: userId, receiver_id: receiverId,
  })
  return { error: error?.message }
}

export async function getSentFlirtIds() {
  const userId = await getCurrentUserId()
  if (!userId) return []
  const { data } = await supabase().from('flirts').select('receiver_id').eq('sender_id', userId)
  return (data ?? []).map(f => f.receiver_id)
}

export async function blockProfile(blockedId: string) {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated' }
  const { error } = await supabase().from('blocks').insert({ blocker_id: userId, blocked_id: blockedId })
  return { error: error?.message }
}

export async function getBlockedIds() {
  const userId = await getCurrentUserId()
  if (!userId) return []
  const { data } = await supabase().from('blocks').select('blocked_id').eq('blocker_id', userId)
  return (data ?? []).map(b => b.blocked_id)
}

export async function reportProfile(reportedId: string, reason: string) {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated' }
  const { error } = await supabase().from('reports').insert({ reporter_id: userId, reported_id: reportedId, reason })
  return { error: error?.message }
}

export async function sendAudioMessage(matchId: string, blob: Blob) {
  try {
    const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 15000)
    const fd = new FormData()
    fd.append('matchId', matchId)
    fd.append('audio', file)
    const res = await fetch('/api/messages/audio', {
      method: 'POST',
      signal: ctrl.signal,
      body: fd,
    })
    clearTimeout(t)
    const data = await res.json()
    if (!res.ok) return { error: data.error ?? "Erreur lors de l'envoi vocal" }
    return { data: data.data as Message }
  } catch (err) {
    logger.error('sendAudioMessage error', { error: String(err) })
    return { error: 'Erreur réseau' }
  }
}

export async function sendPhotoMessage(matchId: string, file: File) {
  try {
    const { userId, error: authErr } = await assertMatchParticipant(matchId)
    if (authErr || !userId) return { error: authErr }
    const err = validateFile(file, 'chat_photo')
    if (err) return { error: err }

    const { data: match } = await supabase().from('matches').select('user1_id, user2_id').eq('id', matchId).maybeSingle()
    if (!match) return { error: 'Match introuvable' }
    const targetId = match.user1_id === userId ? match.user2_id : match.user1_id

    const { data: block } = await supabase().from('blocks').select('id').eq('blocker_id', targetId).eq('blocked_id', userId).maybeSingle()
    if (block) return { error: 'Action non autorisée' }

    const fileName = `chat/${matchId}/${Date.now()}_${userId}_${sanitizeFilename(file.name)}`
    const { error: uploadError } = await supabase().storage.from('chat_photos').upload(fileName, file)
    if (uploadError) return { error: uploadError.message }

    const { data: urlData } = supabase().storage.from('chat_photos').getPublicUrl(fileName)

    const { error } = await supabase().from('messages').insert({
      match_id: matchId, sender_id: userId, image_url: urlData.publicUrl,
    })
    if (error) {
      await supabase().storage.from('chat_photos').remove([fileName])
      return { error: error.message }
    }
    return {}
  } catch (err) {
    logger.error('sendPhotoMessage error', { error: String(err) })
    return { error: 'Erreur lors de l\'envoi de la photo' }
  }
}

export async function unmatchUser(matchId: string) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return { error: 'Non authentifié' }
    const res = await fetch('/api/delete-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { error: body.error || 'Erreur lors de la suppression' }
    }
    return {}
  } catch (err) {
    logger.error('unmatchUser error', { error: String(err) })
    return { error: err instanceof Error ? err.message : 'Erreur réseau' }
  }
}

export async function getLastSwipe() {
  const userId = await getCurrentUserId()
  if (!userId) return null
  const { data, error } = await supabase().from('swipes').select('*').eq('swiper_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle() as PostgrestMaybeSingleResponse<Swipe>
  if (error || !data) return null
  return data
}

export async function deleteLastSwipe() {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated' }
  const last = await getLastSwipe()
  if (!last) return { error: 'No swipe to undo' }
  const { error } = await supabase().from('swipes').delete().eq('id', last.id)
  return { error: error?.message }
}

// ---- NEW FEATURES ----

// 1. Geolocation
export async function updateLocation(latitude: number, longitude: number) {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated' }
  const { error } = await supabase().from('profiles').update({ latitude, longitude }).eq('id', userId)
  return { error: error?.message }
}

export async function getProfilesNearby(lat: number, lng: number, radiusKm: number, excludeIds: string[], filters?: ProfileFilters) {
  const latDelta = radiusKm / 111
  const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180))
  const compatibleExclude = await getCompatibleOnlyExclude()
  const currentUserId = await getCurrentUserId()
  const allExclude = [...new Set([...excludeIds, ...compatibleExclude, ...(currentUserId ? [currentUserId] : [])])]
  let q = supabase()
    .from('profiles')
    .select(PUBLIC_PROFILE_FIELDS)
    .eq('onboarding_complete', true)
    .eq('profile_visible', true)
    .gte('latitude', lat - latDelta)
    .lte('latitude', lat + latDelta)
    .gte('longitude', lng - lngDelta)
    .lte('longitude', lng + lngDelta)
  if (allExclude.length > 0) q = q.not('id', 'in', `(${allExclude.join(',')})`)
  if (filters?.minAge) q = q.gte('age', filters.minAge)
  if (filters?.maxAge) q = q.lte('age', filters.maxAge)
  if (filters?.lookingFor) q = q.eq('looking_for', filters.lookingFor)
  if (filters?.interestedIn?.length) q = q.in('gender', filters.interestedIn)
  if (filters?.gender) q = q.contains('interested_in', [filters.gender])
  const { data, error } = await q
  const attached = await attachScoresAndMood(data)
  return { data: attached, error: error?.message }
}

// 2. Super like limit
export async function getSuperLikesRemaining() {
  const userId = await getCurrentUserId()
  if (!userId) return 0
  const { tier } = await getSubscriptionStatus()
  if (tier === 'premium') return 99
  const { data, error } = await supabase()
    .from('profiles')
    .select('super_likes_remaining, super_likes_reset_at')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) return 0
  const resetDate = new Date(data.super_likes_reset_at)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (resetDate < today) return 1
  return data.super_likes_remaining ?? 0
}

export async function useSuperLike() {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated' }
  const { tier } = await getSubscriptionStatus()
  if (tier === 'premium') return {}
  const { data, error } = await supabase()
    .from('profiles')
    .select('super_likes_remaining, super_likes_reset_at')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) return { error: 'Profil introuvable' }
  const resetDate = new Date(data.super_likes_reset_at)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const remaining = resetDate < today ? 1 : (data.super_likes_remaining ?? 0)
  if (remaining <= 0) return { error: 'Plus de super like disponible aujourd\'hui' }
  const { error: updErr } = await supabase()
    .from('profiles')
    .update({ super_likes_remaining: remaining - 1, super_likes_reset_at: new Date().toISOString() })
    .eq('id', userId)
    .eq('super_likes_remaining', data.super_likes_remaining)
  if (updErr) return { error: updErr.message }
  return {}
}

// 5. Quiz
export async function getQuizQuestions() {
  const { data, error } = await supabase().from('quiz_questions').select('*')
  return { data: data as Array<{ id: string; question: string; options: Array<{ text: string; trait: string }>; category: string | null }> | null, error: error?.message }
}

export async function saveQuizAnswers(answers: { questionId: string; answerIndex: number }[]) {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated' }
  const rows = answers.map(a => ({ user_id: userId, question_id: a.questionId, answer_index: a.answerIndex }))
  const { error } = await supabase().from('quiz_answers').upsert(rows, { onConflict: 'user_id,question_id' })
  return { error: error?.message ?? null }
}

export async function getQuizAnswers() {
  const userId = await getCurrentUserId()
  if (!userId) return { data: [] }
  const { data, error } = await supabase().from('quiz_answers').select('*').eq('user_id', userId)
  return { data: data ?? [], error: error?.message }
}

// 6. Compatibility
export async function getCompatibilityBatch(otherUserIds: string[]) {
  const userId = await getCurrentUserId()
  if (!userId || otherUserIds.length === 0) return {}
  const results = await Promise.all(otherUserIds.slice(0, 50).map(id =>
    supabase().rpc('get_compatibility', { user_a_id: userId, user_b_id: id })
  ))
  const scores: Record<string, number> = {}
  results.forEach((r, i) => {
    if (r.data !== undefined) scores[otherUserIds[i]] = Number(r.data) || 0
  })
  return scores
}

export async function getCompatibilityReport(matchId: string) {
  const res = await fetch(`/api/compatibility/${matchId}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur réseau' }))
    return { data: null, error: err.error }
  }
  const data = await res.json()
  return { data, error: null }
}

// 9. Typing indicator (no SQL, uses Realtime channels)

// ---- FEATURE 1: Premium / PayDunya ----
export async function createCheckoutSession(plan: 'monthly' | 'yearly' = 'monthly'): Promise<{ url?: string; error?: string }> {
  try {
    const res = await fetch('/api/paydunya/create-checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error || 'Erreur de paiement' }
    if (!data.url) return { error: 'URL de paiement manquante' }
    return { url: data.url as string }
  } catch (err) {
    logger.error('createCheckoutSession error', { error: String(err) })
    return { error: 'Erreur réseau. Vérifie ta connexion.' }
  }
}

export async function getSubscriptionStatus() {
  const userId = await getCurrentUserId()
  if (!userId) return { tier: 'free' as const }
  const { data } = await supabase().from('profiles').select('subscription_tier, premium_expires_at').eq('id', userId).maybeSingle()
  const tier = ((data?.subscription_tier ?? 'free') as 'free' | 'premium')
  if (tier === 'premium' && data?.premium_expires_at && new Date(data.premium_expires_at) < new Date()) {
    await supabase().from('profiles').update({ subscription_tier: 'free', premium_expires_at: null }).eq('id', userId)
    return { tier: 'free' as const }
  }
  return { tier }
}

export async function checkPremium() {
  const { tier } = await getSubscriptionStatus()
  return tier === 'premium'
}

export async function getVerificationStatus(): Promise<{
  status: string | null
  verification_status: string | null
  is_verified: boolean | null
  verified_at: string | null
  rejection_reason: string | null
}> {
  const userId = await getCurrentUserId()
  const fallback = { status: null, verification_status: null, is_verified: null, verified_at: null, rejection_reason: null }
  if (!userId) return fallback
  const supabaseClient = supabase()
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('is_verified, verification_status, verified_at')
    .eq('id', userId)
    .maybeSingle()
  if (!profile) return { ...fallback, status: null }
  const { data: req } = await supabaseClient
    .from('verification_requests')
    .select('rejection_reason')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return {
    status: profile.verification_status,
    verification_status: profile.verification_status,
    is_verified: profile.is_verified,
    verified_at: profile.verified_at,
    rejection_reason: req?.rejection_reason ?? null,
  }
}

// ---- FEATURE 4: Stories (legacy wrappers, use src/lib/stories for new code) ----

// ---- FEATURE 5: Travel mode ----
export async function setTravelMode(city: string, active: boolean) {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated' }
  const { error } = await supabase().from('profiles').update({ travel_city: city, travel_active: active }).eq('id', userId)
  return { error: error?.message }
}

export async function getTravelMode() {
  const userId = await getCurrentUserId()
  if (!userId) return { city: null, active: false }
  const { data } = await supabase().from('profiles').select('travel_city, travel_active').eq('id', userId).maybeSingle()
  return { city: data?.travel_city ?? null, active: data?.travel_active ?? false }
}

// ---- FEATURE 7: Notifications ----
export async function getNotifications() {
  const userId = await getCurrentUserId()
  if (!userId) return { data: [] }
  const { data, error } = await supabase()
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey(name, photos)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)
  return { data: data ?? [], error: error?.message }
}

export async function markNotificationRead(notificationId: string) {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated' }
  const { error } = await supabase().from('notifications').update({ read: true }).eq('id', notificationId).eq('user_id', userId)
  return { error: error?.message }
}

export async function getNotificationUnreadCount() {
  const userId = await getCurrentUserId()
  if (!userId) return 0
  const { count } = await supabase()
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)
  return count ?? 0
}

// ---- FEATURE 8: Compatibility ----
// Already has getCompatibilityWith() above (line 405)

// ---- FEATURE 10: Video profile ----
export async function uploadProfileVideo(file: File) {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated' }
  const err = validateFile(file, 'video')
  if (err) return { error: err }
  const fileName = `profile_videos/${userId}/${Date.now()}_${sanitizeFilename(file.name, 'mp4')}`
  const { error: uploadError } = await supabase().storage.from('profile_videos').upload(fileName, file)
  if (uploadError) return { error: uploadError.message }
  const { data: urlData } = supabase().storage.from('profile_videos').getPublicUrl(fileName)
  const { error } = await supabase().from('profiles').update({ video_url: urlData.publicUrl } satisfies Partial<Profile>).eq('id', userId)
  return { url: urlData.publicUrl, error: error?.message }
}

export async function deleteProfileVideo() {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated' }
  const { data: profile } = await supabase().from('profiles').select('video_url').eq('id', userId).maybeSingle()
  if (profile?.video_url) {
    const fileName = profile.video_url.split('/profile_videos/').pop()
    if (fileName) await supabase().storage.from('profile_videos').remove([fileName])
  }
  const { error } = await supabase().from('profiles').update({ video_url: null } satisfies Partial<Profile>).eq('id', userId)
  return { error: error?.message }
}

// ---- FEATURE 11: Moderation ----
export async function getModerationQueue() {
  const userId = await getCurrentUserId()
  if (!userId) return { data: [], error: 'Not authenticated' }
  const { data: profile } = await supabase().from('profiles').select('is_admin').eq('id', userId).maybeSingle()
  if (!profile?.is_admin) return { data: [], error: 'Accès refusé' }
  const { data, error } = await supabase().from('moderation_queue').select('*').limit(50).order('created_at', { ascending: false })
  return { data: data ?? [], error: error?.message }
}

export async function reviewContent(id: string, approved: boolean) {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated' }
  const { data: profile } = await supabase().from('profiles').select('is_admin').eq('id', userId).maybeSingle()
  if (!profile?.is_admin) return { error: 'Accès refusé' }
  const { error } = await supabase().from('moderation_queue').update({ reviewed: true, status: approved ? 'approved' : 'rejected' }).eq('id', id)
  return { error: error?.message ?? null }
}

export async function getEvents() {
  const { data, error } = await supabase()
    .from('events')
    .select('*, creator:profiles!events_creator_id_fkey(name, photos), participants:event_participants(*)')
    .order('event_date', { ascending: true })
  return { data: data ?? [], error: error?.message }
}

// ---- FEATURE 14: Date ideas ----
export async function getDateIdeas(category?: string) {
  let q = supabase().from('date_ideas').select('*')
  if (category) q = q.eq('category', category)
  const { data, error } = await q
  return { data: data ?? [], error: error?.message }
}

export async function saveDateIdea(ideaId: string) {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated' }
  const { error } = await supabase().from('user_date_ideas').insert({ user_id: userId, idea_id: ideaId })
  return { error: error?.message }
}

export async function removeDateIdea(ideaId: string) {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated' }
  const { error } = await supabase().from('user_date_ideas').delete().eq('user_id', userId).eq('idea_id', ideaId)
  return { error: error?.message }
}

export async function getMyDateIdeas() {
  const userId = await getCurrentUserId()
  if (!userId) return { data: [] }
  const { data, error } = await supabase()
    .from('user_date_ideas')
    .select('*, idea:date_ideas!user_date_ideas_idea_id_fkey(*)')
    .eq('user_id', userId)
  return { data: data ?? [], error: error?.message }
}

// ---- FEATURE 16: Gifts ----
export async function getGifts() {
  const { data, error } = await supabase().from('gifts').select('*')
  return { data: data ?? [], error: error?.message }
}

export async function getReceivedGifts() {
  const userId = await getCurrentUserId()
  if (!userId) return { data: [] }
  const { data, error } = await supabase()
    .from('sent_gifts')
    .select('*, sender:profiles!sent_gifts_sender_id_fkey(name, photos), gift:gifts!sent_gifts_gift_id_fkey(*)')
    .eq('receiver_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)
  return { data: data ?? [], error: error?.message }
}

// ---- FEATURE 18: Quiz Profile Display ----
export async function getProfileTraits(userId: string) {
  const { data, error } = await supabase().rpc('get_user_top_traits', { p_user_id: userId })
  return { data: data as Array<{ trait: string; count: number }> | null, error: error?.message }
}

// ---- FEATURE 19: Read Receipts ----
export async function markAsRead(matchId: string) {
  const { userId, error: authErr } = await assertMatchParticipant(matchId)
  if (authErr || !userId) return { error: authErr }
  const { data: privacy } = await supabase()
    .from('privacy_settings').select('read_receipts').eq('user_id', userId).maybeSingle()
  if (privacy && !privacy.read_receipts) return { data: 0, error: undefined }
  const { data, error } = await supabase().rpc('mark_messages_read', { p_match_id: matchId, p_reader_id: userId })
  return { data: data as number | null, error: error?.message }
}

// ---- FEATURE 20: Ghost Mode ----
export async function setGhostMode(enabled: boolean) {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated' }
  const { error } = await supabase().from('profiles').update({
    ghost_mode: enabled, last_active_at: new Date().toISOString(),
  }).eq('id', userId)
  return { error: error?.message }
}

export async function getGhostMode() {
  const userId = await getCurrentUserId()
  if (!userId) return false
  const { data, error } = await supabase().from('profiles').select('ghost_mode').eq('id', userId).maybeSingle()
  if (error || !data) return false
  return (data as { ghost_mode: boolean }).ghost_mode
}

export async function getAIIcebreaker(targetId: string) {
  try {
    const res = await fetch('/api/ai/icebreaker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId }),
    })
    const json = await res.json()
    if (!res.ok) return { suggestion: null, error: json.error }
    return { suggestion: json.suggestion as string, error: null }
  } catch (err) {
    logger.error('getAIIcebreaker error', { error: String(err) })
    return { suggestion: null, error: 'Erreur réseau' }
  }
}

export async function getMessageSuggestions(matchId: string): Promise<{ suggestions: string[]; error?: string }> {
  try {
    const res = await fetch('/api/ai/message-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId }),
    })
    const json = await res.json()
    if (!res.ok) return { suggestions: [], error: json.error }
    return { suggestions: json.suggestions as string[] }
  } catch (err) {
    logger.error('getMessageSuggestions error', { error: String(err) })
    return { suggestions: [], error: 'Erreur réseau' }
  }
}

// ---- FEATURE 22: Streaks ----
export async function getStreak() {
  const userId = await getCurrentUserId()
  if (!userId) return { data: null }
  const { data, error } = await supabase().from('streaks').select('*').eq('user_id', userId).maybeSingle()
  return { data: data as { current_streak: number; longest_streak: number; last_message_date: string } | null, error: error?.message }
}

// ---- FEATURE 24: Daily Profile ----
export async function getDailyProfile() {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated' }
  const { data: rpcData, error: rpcError } = await supabase().rpc('select_daily_profile')
  if (!rpcData || rpcError) return { data: null, error: rpcError?.message }
  const { data: profile } = await supabase().from('profiles').select(PUBLIC_PROFILE_FIELDS).eq('id', rpcData as string).maybeSingle()
  const attached = await attachScoresAndMood(profile ? [profile] : null)
  return { data: attached?.[0] ?? null, error: null }
}

// ---- DAILY SWIPE LIMIT ----
const DAILY_SWIPE_LIMIT_FREE = 20

export async function getDailySwipeCount() {
  const userId = await getCurrentUserId()
  if (!userId) return { count: 0, limit: DAILY_SWIPE_LIMIT_FREE }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count } = await supabase()
    .from('swipes')
    .select('*', { count: 'exact', head: true })
    .eq('swiper_id', userId)
    .gte('created_at', today.toISOString())
  const { tier } = await getSubscriptionStatus()
  const limit = tier === 'premium' ? Infinity : DAILY_SWIPE_LIMIT_FREE
  return { count: count ?? 0, limit }
}

// 99. Paginated queries
const PAGE_SIZE = 20

async function getCompatibleOnlyExclude(): Promise<string[]> {
  try {
    const res = await fetch('/api/privacy/check')
    if (!res.ok) return []
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

export async function getProfilesPaginated(excludeIds: string[], page: number, filters?: ProfileFilters) {
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const compatibleExclude = await getCompatibleOnlyExclude()
  const currentUserId = await getCurrentUserId()
  const allExclude = [...new Set([...excludeIds, ...compatibleExclude, ...(currentUserId ? [currentUserId] : [])])]
  let q = supabase().from('profiles').select(PUBLIC_PROFILE_FIELDS).eq('onboarding_complete', true).eq('profile_visible', true)
  if (allExclude.length > 0) q = q.not('id', 'in', `(${allExclude.join(',')})`)
  if (filters?.minAge) q = q.gte('age', filters.minAge)
  if (filters?.maxAge) q = q.lte('age', filters.maxAge)
  if (filters?.lookingFor) q = q.eq('looking_for', filters.lookingFor)
  if (filters?.interestedIn?.length) q = q.in('gender', filters.interestedIn)
  if (filters?.gender) q = q.contains('interested_in', [filters.gender])
  if (!filters?.showIncognito) q = q.eq('incognito', false)
  q = q.range(from, to)
  const { data, error } = await q
  const attached = await attachScoresAndMood(data)
  return { data: attached, error: error?.message }
}

// ---- CITY SEARCH ----
export async function searchProfilesByCity(city: string, excludeIds: string[], filters?: ProfileFilters) {
  const compatibleExclude = await getCompatibleOnlyExclude()
  const currentUserId = await getCurrentUserId()
  const allExclude = [...new Set([...excludeIds, ...compatibleExclude, ...(currentUserId ? [currentUserId] : [])])]
  let q = supabase()
    .from('profiles')
    .select(PUBLIC_PROFILE_FIELDS)
    .eq('onboarding_complete', true)
    .eq('profile_visible', true)
    .ilike('location', `${city.replace(/[%_]/g, '').trim()}%`)
  if (allExclude.length > 0) q = q.not('id', 'in', `(${allExclude.join(',')})`)
  if (filters?.minAge) q = q.gte('age', filters.minAge)
  if (filters?.maxAge) q = q.lte('age', filters.maxAge)
  if (filters?.lookingFor) q = q.eq('looking_for', filters.lookingFor)
  if (filters?.interestedIn?.length) q = q.in('gender', filters.interestedIn)
  if (filters?.gender) q = q.contains('interested_in', [filters.gender])
  q = q.eq('incognito', false)
  const { data, error } = await q
  const attached = await attachScoresAndMood(data)
  return { data: attached, error: error?.message }
}

// ---- EME: Behavior Tracking ----
export async function logBehavior(action: BehaviorAction, targetId?: string, metadata?: Record<string, unknown>) {
  const res = await fetch('/api/engine/behavior', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, targetId, metadata }),
  })
  return res.ok
}

export async function updateEnergyScore() {
  const res = await fetch('/api/engine/energy-score', { method: 'POST' })
  return res.ok
}

// ---- DIDIT Identity Verification ----
export async function createDiditSession(): Promise<{ url?: string; error?: string }> {
  try {
    const res = await fetch('/api/verify/didit', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) return { error: data.error ?? 'Erreur lors de la création de la session' }
    return { url: data.url }
  } catch (err) {
    logger.error('createDiditSession error', { error: String(err) })
    return { error: 'Erreur réseau' }
  }
}

// ---- MOBILE MONEY ----
const COUNTRIES = {
  SN: { name: 'Sénégal', operators: ['Orange Money', 'Free Money', 'Wave'] },
  CI: { name: 'Côte d\'Ivoire', operators: ['Orange Money', 'MTN Mobile Money', 'Moov Money', 'Wave'] },
  ML: { name: 'Mali', operators: ['Orange Money', 'Moov Money'] },
  BF: { name: 'Burkina Faso', operators: ['Orange Money', 'Moov Money', 'Wave'] },
  TG: { name: 'Togo', operators: ['Orange Money', 'Moov Money'] },
  BJ: { name: 'Bénin', operators: ['Orange Money', 'Moov Money', 'MTN Mobile Money'] },
  CM: { name: 'Cameroun', operators: ['Orange Money', 'MTN Mobile Money'] },
  CG: { name: 'Congo', operators: ['Airtel Money', 'MTN Mobile Money'] },
}

export function getCountries() {
  return Object.entries(COUNTRIES).map(([code, v]) => ({ code, name: v.name, operators: v.operators }))
}

export async function savePaymentAccount(data: { type: 'mobile_money' | 'card'; phone?: string; country?: string; operator?: string; card_last4?: string; card_brand?: string }) {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Non authentifié' }
  const { error } = await supabase().from('payment_accounts').upsert({
    user_id: userId, ...data,
  }, { onConflict: 'user_id' })
  return { error: error?.message }
}

export async function getPaymentAccount() {
  const userId = await getCurrentUserId()
  if (!userId) return null
  const { data } = await supabase()
    .from('payment_accounts').select('*').eq('user_id', userId).maybeSingle()
  return data as { phone?: string; operator?: string; country?: string; type: string; card_last4?: string; card_brand?: string } | null
}

// ---- GIFT PAYMENT ----
export async function createGiftCheckout(giftId: string, receiverId: string, matchId: string, message?: string, phone?: string, operator?: string) {
  try {
    const res = await fetch('/api/paydunya/create-gift-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ giftId, receiverId, matchId, message, phone, operator }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error || 'Erreur de paiement' }
    if (data.sent) return { data: { sent: true as const }, error: null }
    if (!data.url) return { error: 'URL de paiement manquante' }
    return { data: { url: data.url as string }, error: null }
  } catch (err) {
    logger.error('createGiftCheckout error', { error: String(err) })
    return { error: 'Erreur réseau. Vérifie ta connexion.' }
  }
}

export async function createCartCheckout(giftIds: string[], receiverId: string, matchId: string, message?: string, phone?: string, operator?: string) {
  try {
    const res = await fetch('/api/paydunya/create-cart-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ giftIds, receiverId, matchId, message, phone, operator }),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error || 'Erreur de paiement' }
    if (data.sent) return { data: { sent: true as const }, error: null }
    if (!data.url) return { error: 'URL de paiement manquante' }
    return { data: { url: data.url as string }, error: null }
  } catch (err) {
    logger.error('createCartCheckout error', { error: String(err) })
    return { error: 'Erreur réseau. Vérifie ta connexion.' }
  }
}

// ---- GIFT WALLET / BALANCE ----
export async function getGiftBalance() {
  const userId = await getCurrentUserId()
  if (!userId) return 0

  const { data: received } = await supabase()
    .from('sent_gifts')
    .select('amount_paid, fee_cents')
    .eq('receiver_id', userId)
    .eq('status', 'completed')

  const totalReceived = (received ?? []).reduce((sum, g) =>
    sum + (g.amount_paid ?? 0) - (g.fee_cents ?? 0), 0)

  const { data: payouts } = await supabase()
    .from('gift_transactions')
    .select('amount_cents')
    .eq('user_id', userId)
    .eq('type', 'payout')
    .eq('status', 'completed')

  const totalPayouts = (payouts ?? []).reduce((sum, t) => sum + t.amount_cents, 0)

  return totalReceived - totalPayouts
}

export async function requestPayout(amountCents: number) {
  const res = await fetch('/api/paydunya/process-payout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amountCents }),
  })
  const data = await res.json()
  if (!res.ok) return { error: data.error }
  return { success: true, message: data.message }
}

export async function getGiftTransactions() {
  const userId = await getCurrentUserId()
  if (!userId) return { data: [] }
  const { data, error } = await supabase()
    .from('gift_transactions')
    .select('*')
    .eq('user_id', userId)
    .limit(50)
    .order('created_at', { ascending: false })
  return { data: data ?? [], error: error?.message }
}

export async function completeOnboarding() {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Non authentifié' }
  const { error } = await supabase().from('profiles').update({ onboarding_complete: true }).eq('id', userId)
  return { error: error?.message }
}

export { signOut, resetPassword } from './auth'


