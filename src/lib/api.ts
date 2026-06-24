import { createClient } from './supabase/client'

export type LookingFor = 'friendship' | 'casual' | 'fwb' | 'serious' | 'open'

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
}

export interface Message {
  id: string
  match_id: string
  sender_id: string
  text: string | null
  image_url: string | null
  created_at: string
}

const supabase = createClient()

export async function signUp(email: string, password: string, name: string, age: number) {
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
  if (authError || !authData.user) return { error: authError?.message ?? 'Signup failed' }

  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id, name, age, photos: [], interests: [],
  })

  if (profileError) return { error: profileError.message }
  return { data: authData.user }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }
  return { data: data.user }
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
  return { error: error?.message }
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  return { error: error?.message }
}

export async function getProfiles(excludeIds: string[], filters?: { minAge?: number; maxAge?: number; lookingFor?: string }) {
  let q = supabase.from('profiles').select('*')
  if (excludeIds.length > 0) q = q.not('id', 'in', `(${excludeIds.join(',')})`)
  if (filters?.minAge) q = q.gte('age', filters.minAge)
  if (filters?.maxAge) q = q.lte('age', filters.maxAge)
  if (filters?.lookingFor) q = q.eq('looking_for', filters.lookingFor)
  const { data, error } = await q
  return { data: data as Profile[] | null, error: error?.message }
}

export async function getProfile(id: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
  return { data: data as Profile | null, error: error?.message }
}

export async function updateProfile(id: string, updates: Partial<Profile>) {
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', id)
  return { data, error: error?.message }
}

export async function createSwipe(swipedId: string, direction: Swipe['direction']) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data, error } = await supabase.from('swipes').insert({
    swiper_id: user.id, swiped_id: swipedId, direction,
  }).select().single()
  return { data: data as Swipe | null, error: error?.message }
}

export async function getSwipedIds() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('swipes').select('swiped_id').eq('swiper_id', user.id)
  return (data ?? []).map((s) => s.swiped_id)
}

export async function getMatches() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data, error } = await supabase
    .from('matches').select('*')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
  return { data: data as Match[] | null, error: error?.message }
}

export async function checkForMatch(swipedId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { isMatch: false }
  const { data } = await supabase
    .from('matches').select('*')
    .or(`and(user1_id.eq.${user.id},user2_id.eq.${swipedId}),and(user1_id.eq.${swipedId},user2_id.eq.${user.id})`)
    .maybeSingle()
  return { isMatch: !!data, match: data as Match | null }
}

export async function getMessages(matchId: string) {
  const { data, error } = await supabase
    .from('messages').select('*').eq('match_id', matchId).order('created_at', { ascending: true })
  return { data: data as Message[] | null, error: error?.message }
}

export async function sendMessage(matchId: string, text: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data, error } = await supabase.from('messages').insert({
    match_id: matchId, sender_id: user.id, text,
  }).select().single()
  return { data: data as Message | null, error: error?.message }
}

export async function uploadPhoto(uri: File, userId: string, index: number) {
  const ext = uri.name.split('.').pop() ?? 'jpg'
  const fileName = `${userId}/${index}.${ext}`
  const { error } = await supabase.storage.from('photos').upload(fileName, uri, { upsert: true })
  if (error) return { error: error.message }
  const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName)
  return { url: urlData.publicUrl }
}

export async function deletePhoto(userId: string, photoUrl: string, currentPhotos: string[]) {
  const fileName = photoUrl.split('/photos/').pop()
  if (fileName) await supabase.storage.from('photos').remove([fileName])
  const photos = currentPhotos.filter(p => p !== photoUrl)
  const { error } = await supabase.from('profiles').update({ photos }).eq('id', userId)
  return { photos, error: error?.message }
}

export async function setPrimaryPhoto(userId: string, photoUrl: string, currentPhotos: string[]) {
  const photos = [photoUrl, ...currentPhotos.filter(p => p !== photoUrl)]
  const { error } = await supabase.from('profiles').update({ photos }).eq('id', userId)
  return { photos, error: error?.message }
}

export async function sendFlirt(receiverId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase.from('flirts').insert({
    sender_id: user.id, receiver_id: receiverId,
  })
  return { error: error?.message }
}

export async function getReceivedFlirts() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], count: 0 }
  const { data, error } = await supabase
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('flirts').select('receiver_id').eq('sender_id', user.id)
  return (data ?? []).map(f => f.receiver_id)
}

export async function blockProfile(blockedId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: blockedId })
  return { error: error?.message }
}

export async function unblockProfile(blockedId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase.from('blocks').delete().eq('blocker_id', user.id).eq('blocked_id', blockedId)
  return { error: error?.message }
}

export async function getBlockedIds() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id)
  return (data ?? []).map(b => b.blocked_id)
}

export async function reportProfile(reportedId: string, reason: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase.from('reports').insert({ reporter_id: user.id, reported_id: reportedId, reason })
  return { error: error?.message }
}

export async function sendPhotoMessage(matchId: string, file: File) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const fileName = `chat/${matchId}/${Date.now()}_${user.id}.${ext}`
  const { error: uploadError } = await supabase.storage.from('chat_photos').upload(fileName, file)
  if (uploadError) return { error: uploadError.message }

  const { data: urlData } = supabase.storage.from('chat_photos').getPublicUrl(fileName)

  const { error } = await supabase.from('messages').insert({
    match_id: matchId, sender_id: user.id, image_url: urlData.publicUrl,
  })
  return { error: error?.message }
}

export async function unmatchUser(matchId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  await supabase.from('messages').delete().eq('match_id', matchId)
  const { error } = await supabase.from('matches').delete().eq('id', matchId)
  return { error: error?.message }
}

export async function getLastSwipe() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('swipes').select('*, swiped:profiles!swipes_swiped_id_fkey(*)')
    .eq('swiper_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function deleteLastSwipe() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const last = await getLastSwipe()
  if (!last) return { error: 'No swipe to undo' }
  const { error } = await supabase.from('swipes').delete().eq('id', last.id)
  return { error: error?.message }
}
