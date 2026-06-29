import { supabase as sbClient } from './supabase/client'
import type { PostgrestMaybeSingleResponse } from '@supabase/supabase-js'
import type { BehaviorAction } from './engine/types'
import { validateFile, sanitizeFilename } from './media'
import { logger } from './logger'

export type LookingFor = 'friendship' | 'casual' | 'fwb' | 'serious' | 'open'
export type Mood = 'discuter' | 'rencontre' | 'disponible_ce_soir' | 'relation_serieuse' | 'chill' | 'de_passage'

export interface Profile {
  id: string
  name: string
  age: number | null
  bio: string | null
  occupation: string | null
  location: string | null
  photos: string[]
  interests: string[]
  is_verified: boolean
  looking_for: LookingFor
  created_at: string
  last_seen?: string
  incognito: boolean
  ghost_mode: boolean
  last_active_at?: string
  latitude?: number
  longitude?: number
  super_likes_remaining: number
  super_likes_reset_at: string
  travel_city?: string
  travel_active?: boolean
  subscription_tier?: 'free' | 'premium'
  premium_expires_at?: string
  video_url?: string
  mood?: Mood
  energy_score?: number
  trust_score?: number
}

export interface Swipe {
  id: string
  swiper_id: string
  swiped_id: string
  direction: 'like' | 'pass' | 'super_like'
  created_at: string
}

export interface Match {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  ephemeral?: boolean
  read_count?: number
}

export interface Message {
  id: string
  match_id: string
  sender_id: string
  text: string | null
  image_url: string | null
  audio_url?: string
  expires_at?: string
  read_at?: string
  view_once?: boolean
  created_at: string
}

export interface BlockedProfile {
  blocked_id: string
  created_at: string
  blocked: { name: string; photos: string[] } | null
}

function supabase() {
  return sbClient
}

async function assertMatchParticipant(matchId: string): Promise<{ userId?: string; error?: string }> {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data } = await supabase().from('matches').select('user1_id,user2_id').eq('id', matchId).maybeSingle()
  if (!data) return { error: 'Match introuvable' }
  if (data.user1_id !== user.id && data.user2_id !== user.id) return { error: 'Non autorisé' }
  return { userId: user.id }
}

export function resetApiClient() {} // kept for compat, no-op

export async function signUp(email: string, password: string, name: string, age: number) {
  const { data: authData, error: authError } = await supabase().auth.signUp({ email, password })
  if (authError || !authData.user) return { error: authError?.message ?? 'Signup failed' }

  const { error: profileError } = await supabase().from('profiles').insert({
    id: authData.user.id, name, age, photos: [], interests: [],
  })

  if (profileError) return { error: profileError.message }
  return { data: authData.user }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase().auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }
  return { data: data.user }
}

export async function signOut() {
  const { error } = await supabase().auth.signOut()
  resetApiClient()
  return { error: error?.message ?? null }
}

export async function resetPassword(email: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL || 'https://erosia.app'
  const { error } = await supabase().auth.resetPasswordForEmail(email, { redirectTo: `${origin}/reset-password` })
  return { error: error?.message ?? null }
}

export async function updatePassword(password: string) {
  const { error } = await supabase().auth.updateUser({ password })
  return { error: error?.message ?? null }
}

const PUBLIC_PROFILE_FIELDS = 'id, name, age, bio, occupation, location, photos, interests, is_verified, looking_for, mood, energy_score, trust_score, created_at, last_seen, video_url'

export async function getProfiles(excludeIds: string[], filters?: { minAge?: number; maxAge?: number; lookingFor?: string; showIncognito?: boolean }) {
  let q = supabase().from('profiles').select(PUBLIC_PROFILE_FIELDS)
  q = q.eq('onboarding_complete', true)
  if (excludeIds.length > 0) q = q.not('id', 'in', `(${excludeIds.join(',')})`)
  if (filters?.minAge) q = q.gte('age', filters.minAge)
  if (filters?.maxAge) q = q.lte('age', filters.maxAge)
  if (filters?.lookingFor) q = q.eq('looking_for', filters.lookingFor)
  if (!filters?.showIncognito) q = q.eq('incognito', false)
  const { data, error } = await q
  return { data: data as Profile[] | null, error: error?.message }
}

export async function getProfile(id: string) {
  const { data } = await supabase().from('profiles').select(PUBLIC_PROFILE_FIELDS).eq('id', id).maybeSingle()
  if (!data) return { data: null, error: 'Profil introuvable' }
  return { data: data as Profile, error: null }
}

export async function updateProfile(id: string, updates: Partial<Profile>) {
  logger.debug('updateProfile: début', { id, updates })
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) { logger.warn('updateProfile: non authentifié'); return { error: 'Not authenticated' } }
  if (user.id !== id) { logger.warn('updateProfile: accès non autorisé', { userId: user.id, profileId: id }); return { error: 'Non autorisé' } }
  const sanitized = { ...updates }
  if (typeof sanitized.bio === 'string') sanitized.bio = sanitized.bio.replace(/<[^>]*>/g, '').slice(0, 500)
  if (typeof sanitized.name === 'string') sanitized.name = sanitized.name.replace(/<[^>]*>/g, '').slice(0, 80)
  if (typeof sanitized.occupation === 'string') sanitized.occupation = sanitized.occupation.replace(/<[^>]*>/g, '').slice(0, 100)
  if (typeof sanitized.location === 'string') sanitized.location = sanitized.location.replace(/<[^>]*>/g, '').slice(0, 100)
  logger.debug('updateProfile: appel Supabase', { sanitized, id })
  const { data, error } = await supabase().from('profiles').update(sanitized).eq('id', id).select().maybeSingle()
  if (error) { logger.error('updateProfile: erreur Supabase', error); return { error: error.message } }
  if (!data) { logger.warn('updateProfile: données nulles après update (possible RLS)', { id }); return { error: 'Impossible de mettre à jour le profil. Vérifie que tu es bien connecté et réessaie.' } }
  logger.debug('updateProfile: succès', data)
  return { data }
}

export async function createSwipe(swipedId: string, direction: Swipe['direction']) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (swipedId === user.id) return { error: 'Vous ne pouvez pas swiper sur vous-même' }
  const { tier } = await getSubscriptionStatus()
  if (tier !== 'premium') {
    const { count } = await supabase()
      .from('swipes').select('*', { count: 'exact', head: true })
      .eq('swiper_id', user.id)
      .gte('created_at', new Date().toISOString().slice(0, 10))
    if ((count ?? 0) >= 20) return { error: 'Limite de swipe atteinte' }
  }
  const { data, error } = await supabase().from('swipes').insert({
    swiper_id: user.id, swiped_id: swipedId, direction,
  }).select().single()
  return { data: data as Swipe | null, error: error?.message }
}

export async function getSwipedIds() {
  const { data, error } = await supabase().from('swipes').select('swiped_id')
  if (error) return []
  return (data ?? []).map(s => s.swiped_id)
}

export async function getMatches() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data, error } = await supabase()
    .from('matches').select('*')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
  return { data: data as Match[] | null, error: error?.message }
}

export async function checkForMatch(targetId: string) {
  const { data, error } = await supabase().from('matches').select('*').or(`user1_id.eq.${targetId},user2_id.eq.${targetId}`).maybeSingle() as PostgrestMaybeSingleResponse<Match>
  if (error || !data) return { isMatch: false, match: null }
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { isMatch: false, match: null }
  const otherId = data.user1_id === user.id ? data.user2_id : data.user1_id
  return { isMatch: otherId === targetId, match: data }
}

export async function getMessages(matchId: string) {
  const { error: authErr } = await assertMatchParticipant(matchId)
  if (authErr) return { data: null, error: authErr }
  const { data, error } = await supabase()
    .from('messages').select('*').eq('match_id', matchId).order('created_at', { ascending: true })
  return { data: data as Message[] | null, error: error?.message }
}

export async function sendMessage(matchId: string, text: string) {
  const { userId, error: authErr } = await assertMatchParticipant(matchId)
  if (authErr || !userId) return { error: authErr }
  const clean = text.replace(/<[^>]*>/g, '').slice(0, 5000)
  if (!clean.trim()) return { error: 'Message vide' }
  const { data, error } = await supabase().from('messages').insert({
    match_id: matchId, sender_id: userId, text: clean,
  }).select().single()
  return { data: data as Message | null, error: error?.message }
}

export async function uploadPhoto(uri: File, userId: string, index: number) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.id !== userId) return { error: 'Non autorisé' }
  const err = validateFile(uri, 'photo')
  if (err) return { error: err }
  const fileName = `${userId}/${index}.${sanitizeFilename(uri.name)}`
  const { error } = await supabase().storage.from('photos').upload(fileName, uri, { upsert: true })
  if (error) return { error: error.message }
  const { data: urlData } = supabase().storage.from('photos').getPublicUrl(fileName)
  return { url: urlData.publicUrl }
}

export async function deletePhoto(userId: string, photoUrl: string, currentPhotos: string[]) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { photos: currentPhotos, error: 'Not authenticated' }
  if (user.id !== userId) return { photos: currentPhotos, error: 'Non autorisé' }
  const objectPath = photoUrl.split('/storage/v1/object/public/photos/')[1] ?? photoUrl.split('/').pop()
  if (objectPath) await supabase().storage.from('photos').remove([objectPath])
  const photos = currentPhotos.filter(p => p !== photoUrl)
  const { error } = await supabase().from('profiles').update({ photos }).eq('id', userId)
  return { photos, error: error?.message }
}

export async function setPrimaryPhoto(userId: string, photoUrl: string, currentPhotos: string[]) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { photos: currentPhotos, error: 'Not authenticated' }
  if (user.id !== userId) return { photos: currentPhotos, error: 'Non autorisé' }
  const photos = [photoUrl, ...currentPhotos.filter(p => p !== photoUrl)]
  const { error } = await supabase().from('profiles').update({ photos }).eq('id', userId)
  return { photos, error: error?.message }
}

export async function sendFlirt(receiverId: string) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (receiverId === user.id) return { error: 'Vous ne pouvez pas vous envoyer un clin d\'œil' }
  const { error } = await supabase().from('flirts').insert({
    sender_id: user.id, receiver_id: receiverId,
  })
  return { error: error?.message }
}

export async function getReceivedFlirts() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { data: [], count: 0 }
  const { data, error } = await supabase()
    .from('flirts').select(`
      sender_id,
      created_at,
      sender:profiles!flirts_sender_id_fkey(name, photos)
    `)
    .eq('receiver_id', user.id)
    .order('created_at', { ascending: false })
  return { data: data ?? [], count: data?.length ?? 0, error: error?.message }
}

export async function getSentFlirtIds() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return []
  const { data } = await supabase().from('flirts').select('receiver_id').eq('sender_id', user.id)
  return (data ?? []).map(f => f.receiver_id)
}

export async function blockProfile(blockedId: string) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase().from('blocks').insert({ blocker_id: user.id, blocked_id: blockedId })
  return { error: error?.message }
}

export async function getBlockedIds() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return []
  const { data } = await supabase().from('blocks').select('blocked_id').eq('blocker_id', user.id)
  return (data ?? []).map(b => b.blocked_id)
}

export async function reportProfile(reportedId: string, reason: string) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase().from('reports').insert({ reporter_id: user.id, reported_id: reportedId, reason })
  return { error: error?.message }
}

export async function sendPhotoMessage(matchId: string, file: File) {
  const { userId, error: authErr } = await assertMatchParticipant(matchId)
  if (authErr || !userId) return { error: authErr }
  const err = validateFile(file, 'chat_photo')
  if (err) return { error: err }

  const fileName = `chat/${matchId}/${Date.now()}_${userId}_${sanitizeFilename(file.name)}`
  const { error: uploadError } = await supabase().storage.from('chat_photos').upload(fileName, file)
  if (uploadError) return { error: uploadError.message }

  const { data: urlData } = supabase().storage.from('chat_photos').getPublicUrl(fileName)

  const { error } = await supabase().from('messages').insert({
    match_id: matchId, sender_id: userId, image_url: urlData.publicUrl,
  })
  return { error: error?.message }
}

export async function unmatchUser(matchId: string) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: match } = await supabase().from('matches').select('user1_id,user2_id').eq('id', matchId).maybeSingle()
  if (!match) return { error: 'Match introuvable' }
  if (match.user1_id !== user.id && match.user2_id !== user.id) return { error: 'Non autorisé' }
  const otherId = match.user1_id === user.id ? match.user2_id : match.user1_id
  await supabase().from('swipes').delete().or(`and(swiper_id.eq.${user.id},swiped_id.eq.${otherId}),and(swiper_id.eq.${otherId},swiped_id.eq.${user.id})`)
  await supabase().from('messages').delete().eq('match_id', matchId)
  const { error } = await supabase().from('matches').delete().eq('id', matchId)
  return { error: error?.message }
}

export async function getLastSwipe() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return null
  const { data, error } = await supabase().from('swipes').select('*').eq('swiper_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle() as PostgrestMaybeSingleResponse<Swipe>
  if (error || !data) return null
  return data
}

export async function deleteLastSwipe() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const last = await getLastSwipe()
  if (!last) return { error: 'No swipe to undo' }
  const { error } = await supabase().from('swipes').delete().eq('id', last.id)
  return { error: error?.message }
}

// ---- NEW FEATURES ----

// 1. Geolocation
export async function updateLocation(latitude: number, longitude: number) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase().from('profiles').update({ latitude, longitude }).eq('id', user.id)
  return { error: error?.message }
}

export async function getProfilesNearby(lat: number, lng: number, radiusKm: number, excludeIds: string[], filters?: { minAge?: number; maxAge?: number; lookingFor?: string }) {
  const latDelta = radiusKm / 111
  const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180))
  let q = supabase()
    .from('profiles')
    .select(PUBLIC_PROFILE_FIELDS)
    .eq('onboarding_complete', true)
    .gte('latitude', lat - latDelta)
    .lte('latitude', lat + latDelta)
    .gte('longitude', lng - lngDelta)
    .lte('longitude', lng + lngDelta)
  if (excludeIds.length > 0) q = q.not('id', 'in', `(${excludeIds.join(',')})`)
  if (filters?.minAge) q = q.gte('age', filters.minAge)
  if (filters?.maxAge) q = q.lte('age', filters.maxAge)
  if (filters?.lookingFor) q = q.eq('looking_for', filters.lookingFor)
  const { data, error } = await q
  return { data: data as Profile[] | null, error: error?.message }
}

// 2. Super like limit
export async function getSuperLikesRemaining() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return 0
  const { tier } = await getSubscriptionStatus()
  if (tier === 'premium') return 99
  const { data, error } = await supabase()
    .from('profiles')
    .select('super_likes_remaining, super_likes_reset_at')
    .eq('id', user.id)
    .maybeSingle()
  if (error || !data) return 0
  const resetDate = new Date(data.super_likes_reset_at)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (resetDate < today) {
    await supabase().from('profiles').update({ super_likes_remaining: 1, super_likes_reset_at: new Date().toISOString() }).eq('id', user.id)
    return 1
  }
  return data.super_likes_remaining ?? 0
}

export async function useSuperLike() {
  const remaining = await getSuperLikesRemaining()
  if (remaining <= 0) return { error: 'Plus de super like disponible aujourd\'hui' }
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { tier } = await getSubscriptionStatus()
  if (tier !== 'premium') {
    const { error } = await supabase().from('profiles').update({ super_likes_remaining: remaining - 1 }).eq('id', user.id)
    return { error: error?.message }
  }
  return {}
}

// 3. Incognito mode
export async function getIncognito() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return false
  const { data, error } = await supabase().from('profiles').select('incognito').eq('id', user.id).maybeSingle()
  if (error || !data) return false
  return (data as { incognito: boolean }).incognito
}

// 4. Push subscriptions
export async function savePushSubscription(endpoint: string, p256dh: string, auth: string) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase().from('push_subscriptions').insert({
    user_id: user.id, endpoint, p256dh, auth,
  })
  return { error: error?.message }
}

// 5. Quiz
export async function getQuizQuestions() {
  const { data, error } = await supabase().from('quiz_questions').select('*')
  return { data: data as Array<{ id: string; question: string; options: Array<{ text: string; trait: string }>; category: string | null }> | null, error: error?.message }
}

export async function saveQuizAnswers(answers: { questionId: string; answerIndex: number }[]) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const rows = answers.map(a => ({ user_id: user.id, question_id: a.questionId, answer_index: a.answerIndex }))
  const { error } = await supabase().from('quiz_answers').upsert(rows, { onConflict: 'user_id,question_id' })
  return { error: error?.message ?? null }
}

export async function getQuizAnswers() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { data: [] }
  const { data, error } = await supabase().from('quiz_answers').select('*').eq('user_id', user.id)
  return { data: data ?? [], error: error?.message }
}

// 6. Compatibility
export async function getCompatibilityBatch(otherUserIds: string[]) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user || otherUserIds.length === 0) return {}
  const results = await Promise.all(otherUserIds.map(id =>
    supabase().rpc('get_compatibility', { user_a_id: user.id, user_b_id: id })
  ))
  const scores: Record<string, number> = {}
  results.forEach((r, i) => {
    if (r.data !== undefined) scores[otherUserIds[i]] = Number(r.data) || 0
  })
  return scores
}

// 9. Typing indicator (no SQL, uses Realtime channels)

// ---- FEATURE 1: Premium / PayDunya ----
export async function createCheckoutSession(): Promise<{ url?: string; error?: string }> {
  try {
    const res = await fetch('/api/paydunya/create-checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error || 'Erreur de paiement' }
    if (!data.url) return { error: 'URL de paiement manquante' }
    return { url: data.url as string }
  } catch {
    return { error: 'Erreur réseau. Vérifie ta connexion.' }
  }
}

export async function getSubscriptionStatus() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { tier: 'free' as const }
  const { data } = await supabase().from('profiles').select('subscription_tier, premium_expires_at').eq('id', user.id).maybeSingle()
  const tier = ((data?.subscription_tier ?? 'free') as 'free' | 'premium')
  if (tier === 'premium' && data?.premium_expires_at && new Date(data.premium_expires_at) < new Date()) {
    await supabase().from('profiles').update({ subscription_tier: 'free', premium_expires_at: null }).eq('id', user.id)
    return { tier: 'free' as const }
  }
  return { tier }
}

export async function checkPremium() {
  const { tier } = await getSubscriptionStatus()
  return tier === 'premium'
}

export async function getVerificationStatus() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { status: null }
  const { data } = await supabase()
    .from('verification_requests')
    .select('status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return { status: (data?.status as 'pending' | 'approved' | 'rejected' | null) ?? null }
}

// ---- FEATURE 3: Icebreakers ----
export async function getIcebreakers(category?: string) {
  let q = supabase().from('icebreakers').select('*')
  if (category) q = q.eq('category', category)
  const { data, error } = await q
  return { data: data as Array<{ id: string; question: string; category: string | null }> | null, error: error?.message }
}

// ---- FEATURE 4: Stories ----
export async function uploadStory(file: File) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const err = validateFile(file, 'story')
  if (err) return { error: err }

  const fileName = `stories/${user.id}/${Date.now()}_${sanitizeFilename(file.name)}`
  const { error: uploadError } = await supabase().storage.from('stories').upload(fileName, file)
  if (uploadError) return { error: uploadError.message }

  const { data: urlData } = supabase().storage.from('stories').getPublicUrl(fileName)

  const type = file.type.startsWith('video/') ? 'video' : 'image'

  const { data, error } = await supabase().from('stories').insert({
    user_id: user.id, media_url: urlData.publicUrl, type,
  }).select().single()
  return { data, error: error?.message }
}

export async function getActiveStories() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { data: [] }
  const { data, error } = await supabase()
    .from('stories')
    .select('*, profile:profiles!stories_user_id_fkey(name, photos, is_verified)')
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  return { data: data ?? [], error: error?.message }
}

export async function deleteStory(storyId: string) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: story } = await supabase().from('stories').select('user_id').eq('id', storyId).maybeSingle()
  if (!story) return { error: 'Story introuvable' }
  if (story.user_id !== user.id) return { error: 'Non autorisé' }
  const { error } = await supabase().from('stories').delete().eq('id', storyId)
  return { error: error?.message }
}

// ---- FEATURE 5: Travel mode ----
export async function setTravelMode(city: string, active: boolean) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase().from('profiles').update({ travel_city: city, travel_active: active }).eq('id', user.id)
  return { error: error?.message }
}

export async function getTravelMode() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { city: null, active: false }
  const { data } = await supabase().from('profiles').select('travel_city, travel_active').eq('id', user.id).maybeSingle()
  return { city: data?.travel_city ?? null, active: data?.travel_active ?? false }
}

// ---- FEATURE 6: Message reactions ----
export async function addReaction(messageId: string, emoji: string) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data, error } = await supabase().from('message_reactions').insert({
    message_id: messageId, user_id: user.id, emoji,
  }).select().single()
  return { data, error: error?.message }
}

export async function removeReaction(messageId: string) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase().from('message_reactions').delete().eq('message_id', messageId).eq('user_id', user.id)
  return { error: error?.message }
}

// ---- FEATURE 7: Notifications ----
export async function getNotifications() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { data: [] }
  const { data, error } = await supabase()
    .from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey(name, photos)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  return { data: data ?? [], error: error?.message }
}

export async function markNotificationRead(notificationId: string) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase().from('notifications').update({ read: true }).eq('id', notificationId).eq('user_id', user.id)
  return { error: error?.message }
}

export async function getNotificationUnreadCount() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return 0
  const { count } = await supabase()
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)
  return count ?? 0
}

// ---- FEATURE 8: Compatibility ----
// Already has getCompatibilityWith() above (line 405)

// ---- FEATURE 9: Audio messages ----
export async function uploadAudio(file: File, matchId: string) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const err = validateFile(file, 'audio')
  if (err) return { error: err }
  const fileName = `chat_audio/${matchId}/${Date.now()}_${user.id}_${sanitizeFilename(file.name, 'mp3')}`
  const { error: uploadError } = await supabase().storage.from('chat_audio').upload(fileName, file)
  if (uploadError) return { error: uploadError.message }
  const { data: urlData } = supabase().storage.from('chat_audio').getPublicUrl(fileName)
  return { url: urlData.publicUrl }
}

export async function sendAudioMessage(matchId: string, audioUrl: string) {
  const { userId, error: authErr } = await assertMatchParticipant(matchId)
  if (authErr || !userId) return { error: authErr }
  const { data, error } = await supabase().from('messages').insert({
    match_id: matchId, sender_id: userId, audio_url: audioUrl,
  }).select().single()
  return { data: data as Message | null, error: error?.message }
}

// ---- FEATURE 10: Video profile ----
export async function uploadProfileVideo(file: File) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const err = validateFile(file, 'video')
  if (err) return { error: err }
  const fileName = `profile_videos/${user.id}/${Date.now()}_${sanitizeFilename(file.name, 'mp4')}`
  const { error: uploadError } = await supabase().storage.from('profile_videos').upload(fileName, file)
  if (uploadError) return { error: uploadError.message }
  const { data: urlData } = supabase().storage.from('profile_videos').getPublicUrl(fileName)
  const { error } = await supabase().from('profiles').update({ video_url: urlData.publicUrl }).eq('id', user.id)
  return { url: urlData.publicUrl, error: error?.message }
}

export async function deleteProfileVideo() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: profile } = await supabase().from('profiles').select('video_url').eq('id', user.id).maybeSingle()
  if (profile?.video_url) {
    const fileName = profile.video_url.split('/profile_videos/').pop()
    if (fileName) await supabase().storage.from('profile_videos').remove([fileName])
  }
  const { error } = await supabase().from('profiles').update({ video_url: null }).eq('id', user.id)
  return { error: error?.message }
}

// ---- FEATURE 11: Moderation ----
export async function getModerationQueue() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { data: [], error: 'Not authenticated' }
  const { data: profile } = await supabase().from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) return { data: [], error: 'Accès refusé' }
  const { data, error } = await supabase().from('moderation_queue').select('*').order('created_at', { ascending: false })
  return { data: data ?? [], error: error?.message }
}

export async function reviewContent(id: string, approved: boolean) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: profile } = await supabase().from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) return { error: 'Accès refusé' }
  const { error } = await supabase().from('moderation_queue').update({ reviewed: true, status: approved ? 'approved' : 'rejected' }).eq('id', id)
  return { error: error?.message ?? null }
}

// ---- FEATURE 12: Events ----
export async function createEvent(eventData: {
  title: string; description?: string; location?: string; latitude?: number; longitude?: number;
  event_date?: string; max_participants?: number; type: 'date_night' | 'meetup' | 'party' | 'other'
}) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data, error } = await supabase().from('events').insert({
    ...eventData, creator_id: user.id,
  }).select().single()
  return { data, error: error?.message }
}

export async function getEvents() {
  const { data, error } = await supabase()
    .from('events')
    .select('*, creator:profiles!events_creator_id_fkey(name, photos), participants:event_participants(*)')
    .order('event_date', { ascending: true })
  return { data: data ?? [], error: error?.message }
}

export async function joinEvent(eventId: string) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data, error } = await supabase().from('event_participants').insert({
    event_id: eventId, user_id: user.id, status: 'accepted',
  }).select().single()
  return { data, error: error?.message }
}

export async function leaveEvent(eventId: string) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase().from('event_participants').delete().eq('event_id', eventId).eq('user_id', user.id)
  return { error: error?.message }
}

// ---- FEATURE 13: Duels ----
export async function createDuel(profileAId: string, profileBId: string) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data, error } = await supabase().from('duels').insert({
    creator_id: user.id, profile_a_id: profileAId, profile_b_id: profileBId,
  }).select().single()
  return { data, error: error?.message }
}

export async function voteDuel(duelId: string, chosenId: string) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data, error } = await supabase().from('duel_votes').insert({
    duel_id: duelId, voter_id: user.id, chosen_id: chosenId,
  }).select().single()
  return { data, error: error?.message }
}

export async function getDuels() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { data: [], error: 'Not authenticated' }
  const { data, error } = await supabase()
    .from('duels')
    .select('*, profile_a:profiles!duels_profile_a_id_fkey(name, photos), profile_b:profiles!duels_profile_b_id_fkey(name, photos), votes:duel_votes(*)')
    .order('created_at', { ascending: false })
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
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase().from('user_date_ideas').insert({ user_id: user.id, idea_id: ideaId })
  return { error: error?.message }
}

export async function removeDateIdea(ideaId: string) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase().from('user_date_ideas').delete().eq('user_id', user.id).eq('idea_id', ideaId)
  return { error: error?.message }
}

export async function getMyDateIdeas() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { data: [] }
  const { data, error } = await supabase()
    .from('user_date_ideas')
    .select('*, idea:date_ideas!user_date_ideas_idea_id_fkey(*)')
    .eq('user_id', user.id)
  return { data: data ?? [], error: error?.message }
}

// ---- FEATURE 15: Ephemeral chat ----
export async function toggleEphemeral(matchId: string, enabled: boolean) {
  const { error: authErr } = await assertMatchParticipant(matchId)
  if (authErr) return { error: authErr }
  const { error } = await supabase().from('matches').update({ ephemeral: enabled }).eq('id', matchId)
  return { error: error?.message }
}

// ---- FEATURE 16: Gifts ----
export async function getGifts() {
  const { data, error } = await supabase().from('gifts').select('*')
  return { data: data ?? [], error: error?.message }
}

export async function getReceivedGifts() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { data: [] }
  const { data, error } = await supabase()
    .from('sent_gifts')
    .select('*, sender:profiles!sent_gifts_sender_id_fkey(name, photos), gift:gifts!sent_gifts_gift_id_fkey(*)')
    .eq('receiver_id', user.id)
    .order('created_at', { ascending: false })
  return { data: data ?? [], error: error?.message }
}

// ---- FEATURE 17: Visio-Chat ----
export async function startCall(matchId: string, calleeId: string) {
  const { userId, error: authErr } = await assertMatchParticipant(matchId)
  if (authErr || !userId) return { error: authErr }
  const { data, error } = await supabase().from('calls').insert({
    match_id: matchId, caller_id: userId, callee_id: calleeId, status: 'ringing',
  }).select().single()
  return { data: data ?? null, error: error?.message }
}

export async function endCall(callId: string) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: call } = await supabase().from('calls').select('caller_id,callee_id').eq('id', callId).maybeSingle()
  if (!call) return { error: 'Appel introuvable' }
  if (call.caller_id !== user.id && call.callee_id !== user.id) return { error: 'Non autorisé' }
  const { data, error } = await supabase().from('calls').update({
    status: 'ended', ended_at: new Date().toISOString(),
  }).eq('id', callId).select().single()
  return { data: data ?? null, error: error?.message }
}

export async function getCallStatus(matchId: string) {
  const { error: authErr } = await assertMatchParticipant(matchId)
  if (authErr) return { data: null, error: authErr }
  const { data, error } = await supabase()
    .from('calls').select('*').eq('match_id', matchId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return { data: data ?? null, error: error?.message }
}

// ---- FEATURE 18: Quiz Profile Display ----
export async function getProfileTraits(userId: string) {
  const { data, error } = await supabase().rpc('get_user_top_traits', { p_user_id: userId })
  return { data: data as Array<{ trait: string; count: number }> | null, error: error?.message }
}

export async function getProfileQuizSummary(userId: string) {
  const { data, error } = await supabase().rpc('get_profile_quiz_summary', { p_user_id: userId })
  return { data: data as Array<{ question: string; answer: string; trait: string }> | null, error: error?.message }
}

// ---- FEATURE 19: Read Receipts ----
export async function markAsRead(matchId: string) {
  const { userId, error: authErr } = await assertMatchParticipant(matchId)
  if (authErr || !userId) return { error: authErr }
  const { data, error } = await supabase().rpc('mark_messages_read', { p_match_id: matchId, p_reader_id: userId })
  return { data: data as number | null, error: error?.message }
}

export async function getUnreadCount(matchId: string) {
  const { userId, error: authErr } = await assertMatchParticipant(matchId)
  if (authErr || !userId) return 0
  const { data } = await supabase().rpc('get_unread_count', { p_match_id: matchId, p_user_id: userId })
  return Number(data) || 0
}

export async function getLastReadAt(matchId: string) {
  const { error: authErr } = await assertMatchParticipant(matchId)
  if (authErr) return null
  const { data } = await supabase()
    .from('messages').select('read_at').eq('match_id', matchId)
    .not('read_at', 'is', null).order('read_at', { ascending: false }).limit(1).maybeSingle()
  return data?.read_at ?? null
}

// ---- FEATURE 20: Ghost Mode ----
export async function setGhostMode(enabled: boolean) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase().from('profiles').update({
    ghost_mode: enabled, last_active_at: new Date().toISOString(),
  }).eq('id', user.id)
  return { error: error?.message }
}

export async function getGhostMode() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return false
  const { data, error } = await supabase().from('profiles').select('ghost_mode').eq('id', user.id).maybeSingle()
  if (error || !data) return false
  return (data as { ghost_mode: boolean }).ghost_mode
}

// ---- FEATURE 21: Icebreaker AI ----
export async function getIcebreakerSuggestion(targetId: string) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data, error } = await supabase().rpc('generate_icebreaker', { p_user_id: user.id, p_target_id: targetId })
  return { data: data as string | null, error: error?.message }
}

// ---- FEATURE 22: Streaks ----
export async function getStreak() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { data: null }
  const { data, error } = await supabase().from('streaks').select('*').eq('user_id', user.id).maybeSingle()
  return { data: data as { current_streak: number; longest_streak: number; last_message_date: string } | null, error: error?.message }
}

// ---- FEATURE 23: Shared Playlist ----
export async function addPlaylistItem(matchId: string, title: string, artist?: string, url?: string, platform?: string) {
  const { userId, error: authErr } = await assertMatchParticipant(matchId)
  if (authErr || !userId) return { error: authErr }
  const { data, error } = await supabase().from('playlist_items').insert({
    match_id: matchId, user_id: userId, title, artist: artist ?? null, url: url ?? null, platform: platform ?? 'spotify',
  }).select().single()
  return { data: data ?? null, error: error?.message }
}

export async function removePlaylistItem(itemId: string) {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase().from('playlist_items').delete().eq('id', itemId).eq('user_id', user.id)
  return { error: error?.message }
}

export async function getPlaylist(matchId: string) {
  const { error: authErr } = await assertMatchParticipant(matchId)
  if (authErr) return { data: [], error: authErr }
  const { data, error } = await supabase()
    .from('playlist_items')
    .select('*, user:profiles!playlist_items_user_id_fkey(name)')
    .eq('match_id', matchId)
    .order('created_at', { ascending: false })
  return { data: data ?? [], error: error?.message }
}

// ---- FEATURE 24: Daily Profile ----
export async function getDailyProfile() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: rpcData, error: rpcError } = await supabase().rpc('select_daily_profile')
  if (!rpcData || rpcError) return { data: null, error: rpcError?.message }
  const { data: profile } = await supabase().from('profiles').select(PUBLIC_PROFILE_FIELDS).eq('id', rpcData as string).maybeSingle()
  return { data: profile as Profile | null, error: null }
}

// ---- DAILY SWIPE LIMIT ----
const DAILY_SWIPE_LIMIT_FREE = 20

export async function getDailySwipeCount() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { count: 0, limit: DAILY_SWIPE_LIMIT_FREE }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count } = await supabase()
    .from('swipes')
    .select('*', { count: 'exact', head: true })
    .eq('swiper_id', user.id)
    .gte('created_at', today.toISOString())
  const { tier } = await getSubscriptionStatus()
  const limit = tier === 'premium' ? Infinity : DAILY_SWIPE_LIMIT_FREE
  return { count: count ?? 0, limit }
}

// 99. Paginated queries
const PAGE_SIZE = 20

export async function getProfilesPaginated(excludeIds: string[], page: number, filters?: { minAge?: number; maxAge?: number; lookingFor?: string; showIncognito?: boolean }) {
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  let q = supabase().from('profiles').select(PUBLIC_PROFILE_FIELDS).eq('onboarding_complete', true)
  if (excludeIds.length > 0) q = q.not('id', 'in', `(${excludeIds.join(',')})`)
  if (filters?.minAge) q = q.gte('age', filters.minAge)
  if (filters?.maxAge) q = q.lte('age', filters.maxAge)
  if (filters?.lookingFor) q = q.eq('looking_for', filters.lookingFor)
  if (!filters?.showIncognito) q = q.eq('incognito', false)
  q = q.range(from, to)
  const { data, error } = await q
  return { data: data as Profile[] | null, error: error?.message }
}

// ---- UNDO SUPER LIKE ----
export async function undoSuperLike() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data } = await supabase()
    .from('swipes')
    .select('*')
    .eq('swiper_id', user.id)
    .eq('direction', 'super_like')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle() as PostgrestMaybeSingleResponse<Swipe>
  if (!data) return { error: 'Aucun super like à annuler' }
  const { error: delErr } = await supabase().from('swipes').delete().eq('id', data.id)
  if (delErr) return { error: delErr.message }
  const remaining = await getSuperLikesRemaining()
  const { error: updErr } = await supabase().from('profiles').update({ super_likes_remaining: remaining + 1 }).eq('id', user.id)
  if (updErr) return { error: updErr.message }
  return { error: null }
}

// ---- CITY SEARCH ----
export async function searchProfilesByCity(city: string, excludeIds: string[], filters?: { minAge?: number; maxAge?: number; lookingFor?: string }) {
  let q = supabase()
    .from('profiles')
    .select(PUBLIC_PROFILE_FIELDS)
    .eq('onboarding_complete', true)
    .ilike('location', `%${city.replace(/[%_]/g, '')}%`)
  if (excludeIds.length > 0) q = q.not('id', 'in', `(${excludeIds.join(',')})`)
  if (filters?.minAge) q = q.gte('age', filters.minAge)
  if (filters?.maxAge) q = q.lte('age', filters.maxAge)
  if (filters?.lookingFor) q = q.eq('looking_for', filters.lookingFor)
  q = q.eq('incognito', false)
  const { data, error } = await q
  return { data: data as Profile[] | null, error: error?.message }
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
  } catch {
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
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  const { error } = await supabase().from('payment_accounts').upsert({
    user_id: user.id, ...data,
  }, { onConflict: 'user_id' })
  return { error: error?.message }
}

export async function getPaymentAccount() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return null
  const { data } = await supabase()
    .from('payment_accounts').select('*').eq('user_id', user.id).maybeSingle()
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
  } catch {
    return { error: 'Erreur réseau. Vérifie ta connexion.' }
  }
}

// ---- GIFT WALLET / BALANCE ----
export async function getGiftBalance() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return 0

  const { data: received } = await supabase()
    .from('sent_gifts')
    .select('amount_paid, fee_cents')
    .eq('receiver_id', user.id)
    .eq('status', 'completed')

  const totalReceived = (received ?? []).reduce((sum, g) =>
    sum + (g.amount_paid ?? 0) - (g.fee_cents ?? 0), 0)

  const { data: payouts } = await supabase()
    .from('gift_transactions')
    .select('amount_cents')
    .eq('user_id', user.id)
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
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { data: [] }
  const { data, error } = await supabase()
    .from('gift_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  return { data: data ?? [], error: error?.message }
}

export async function completeOnboarding() {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  const { error } = await supabase().from('profiles').update({ onboarding_complete: true }).eq('id', user.id)
  return { error: error?.message }
}

export interface GiftTransaction {
  id: string
  user_id: string
  type: 'gift_received' | 'payout'
  amount_cents: number
  sent_gift_id: string | null
  payment_details: string | null
  status: 'completed' | 'pending' | 'failed' | 'cancelled'
  created_at: string
  updated_at: string
}
