import { createClient } from './supabase/client'

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
  created_at: string
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

export async function getProfiles(excludeIds: string[]) {
  const q = supabase.from('profiles').select('*')
  if (excludeIds.length > 0) q.not('id', 'in', `(${excludeIds.join(',')})`)
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
