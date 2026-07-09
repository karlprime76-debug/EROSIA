import { supabase as sbClient } from '@/lib/supabase/client'
import { validateFile } from '@/lib/media'
import { compressImage, isVideo } from './media'
import type { Story, StoryView, StoryReaction, StoryGroup, StoryPrivacy } from './types'

export type { Story, StoryView, StoryReaction, StoryGroup, StoryPrivacy } from './types'
export { compressImage, compressVideo, isVideo, formatDuration } from './media'

function supabase() {
  return sbClient
}

const PAGE_SIZE = 30

export async function getActiveStories(page = 1, options?: { baseUrl?: string }): Promise<{ data: StoryGroup[]; error?: string }> {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { data: [], error: 'Not authenticated' }

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error } = await supabase()
    .from('stories')
    .select(`
      *,
      profile:profiles!stories_user_id_fkey(id, name, photos, is_verified)
    `)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return { data: [], error: error.message }

  const userIds = [...new Set((data ?? []).map(s => s.user_id))]
  const origin = options?.baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : '')
  const res = await fetch(`${origin}/api/privacy/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUserIds: userIds }),
  })
  const json: { data?: Array<{ user_id: string; story_visibility: string }> } = await res.json()
  const privacyRows = json.data ?? []

  const privacyMap = new Map(privacyRows.map(r => [r.user_id, r.story_visibility]))

  const { data: myMatchIds } = await supabase()
    .from('matches')
    .select('user1_id, user2_id')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

  const matchedIds = new Set<string>()
  for (const m of myMatchIds ?? []) {
    matchedIds.add(m.user1_id === user.id ? m.user2_id : m.user1_id)
  }

  const { data: views } = await supabase()
    .from('story_views')
    .select('story_id, user_id')
    .in('story_id', (data ?? []).map(s => s.id))
    .eq('user_id', user.id)

  const viewedIds = new Set((views ?? []).map(v => v.story_id))
  const viewerReacted = new Set<string>()

  const { data: myReactions } = await supabase()
    .from('story_reactions')
    .select('story_id')
    .in('story_id', (data ?? []).map(s => s.id))
    .eq('user_id', user.id)

  for (const r of myReactions ?? []) {
    viewerReacted.add(r.story_id)
  }

  const groupMap = new Map<string, StoryGroup>()
  for (const s of data ?? []) {
    const sid = s.user_id
    const visibility = privacyMap.get(sid) ?? 'everyone'
    if (visibility === 'nobody') continue
    if (visibility === 'matches' && !matchedIds.has(sid)) continue

    if (!groupMap.has(sid)) {
      groupMap.set(sid, {
        userId: sid,
        name: (s.profile as Record<string, unknown>)?.name as string ?? 'Inconnu',
        photo: ((s.profile as Record<string, unknown>)?.photos as string[])?.[0] ?? '',
        isVerified: !!(s.profile as Record<string, unknown>)?.is_verified,
        stories: [],
        allViewed: true,
      })
    }
    const group = groupMap.get(sid)!
    group.stories.push({
      ...s,
      profile: s.profile as Story['profile'],
      viewer_reacted: viewerReacted.has(s.id),
    } as Story)
    if (!viewedIds.has(s.id)) group.allViewed = false
  }

  const groups = Array.from(groupMap.values()).sort((a, b) => {
    if (a.allViewed !== b.allViewed) return a.allViewed ? 1 : -1
    return b.stories[0].created_at.localeCompare(a.stories[0].created_at)
  })

  return { data: groups, error: undefined }
}

export async function getStoryViews(storyId: string): Promise<{ data: StoryView[]; error?: string }> {
  const { data, error } = await supabase()
    .from('story_views')
    .select('*, profile:profiles!story_views_user_id_fkey(name, photos, is_verified)')
    .eq('story_id', storyId)
    .order('created_at', { ascending: false })
    .limit(50)

  return { data: data as StoryView[] ?? [], error: error?.message }
}

export async function addStoryView(storyId: string): Promise<{ error?: string }> {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: existing } = await supabase()
    .from('story_views')
    .select('id')
    .eq('story_id', storyId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) return {}

  const { error } = await supabase()
    .from('story_views')
    .insert({ story_id: storyId, user_id: user.id })

  return { error: error?.message }
}

export async function addStoryReaction(storyId: string, emoji: string): Promise<{ error?: string }> {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: existing } = await supabase()
    .from('story_reactions')
    .select('id, emoji')
    .eq('story_id', storyId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    if (existing.emoji === emoji) {
      const { error } = await supabase()
        .from('story_reactions')
        .delete()
        .eq('id', existing.id)
      return { error: error?.message }
    }
    const { error } = await supabase()
      .from('story_reactions')
      .update({ emoji })
      .eq('id', existing.id)
    return { error: error?.message }
  }

  const { error } = await supabase()
    .from('story_reactions')
    .insert({ story_id: storyId, user_id: user.id, emoji })

  return { error: error?.message }
}

export async function getStoryReactions(storyId: string): Promise<{ data: StoryReaction[]; error?: string }> {
  const { data, error } = await supabase()
    .from('story_reactions')
    .select('*, profile:profiles!story_reactions_user_id_fkey(name, photos)')
    .eq('story_id', storyId)
    .order('created_at', { ascending: false })
    .limit(50)

  return { data: data as StoryReaction[] ?? [], error: error?.message }
}

export async function uploadStory(
  file: File,
  privacy?: StoryPrivacy,
  onProgress?: (pct: number) => void,
): Promise<{ data: Story | null; error?: string }> {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const validationErr = validateFile(file, 'story')
  if (validationErr) return { data: null, error: validationErr }

  let uploadFile = file

  if (!isVideo(file.type)) {
    try {
      const compressed = await compressImage(file)
      uploadFile = new File([compressed], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' })
    } catch {
      return { data: null, error: 'Erreur de compression' }
    }
  }

  const ext = isVideo(uploadFile.type) ? 'mp4' : 'webp'
  const fileName = `stories/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error: uploadError } = await supabase()
    .storage.from('stories')
    .upload(fileName, uploadFile)

  if (uploadError) return { data: null, error: uploadError.message }
  onProgress?.(90)

  const { data: urlData } = supabase()
    .storage.from('stories')
    .getPublicUrl(fileName)

  const type = isVideo(file.type) ? 'video' : 'image'
  const compressionQuality = isVideo(file.type) ? undefined : 0.82

  const { data, error } = await supabase()
    .from('stories')
    .insert({
      user_id: user.id,
      media_url: urlData.publicUrl,
      type,
      privacy: privacy ?? 'public',
      compression_quality: compressionQuality,
    })
    .select('*, profile:profiles!stories_user_id_fkey(id, name, photos, is_verified)')
    .single()

  if (error) return { data: null, error: error.message }
  onProgress?.(100)

  return { data: data as Story | null }
}

export async function deleteStory(storyId: string): Promise<{ error?: string }> {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: story } = await supabase()
    .from('stories')
    .select('user_id, media_url')
    .eq('id', storyId)
    .maybeSingle()

  if (!story) return { error: 'Story introuvable' }
  if (story.user_id !== user.id) return { error: 'Non autorisé' }

  const storagePath = story.media_url.split('/stories/').pop()
  if (storagePath) {
    await supabase().storage.from('stories').remove([`stories/${storagePath}`])
  }

  await supabase().from('story_views').delete().eq('story_id', storyId)
  await supabase().from('story_reactions').delete().eq('story_id', storyId)
  const { error } = await supabase().from('stories').delete().eq('id', storyId)

  return { error: error?.message }
}

export async function getMyStories(): Promise<{ data: Story[]; error?: string }> {
  const { data: { user } } = await supabase().auth.getUser()
  if (!user) return { data: [], error: 'Not authenticated' }

  const { data, error } = await supabase()
    .from('stories')
    .select('*, profile:profiles!stories_user_id_fkey(id, name, photos, is_verified)')
    .eq('user_id', user.id)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(30)

  return { data: data as Story[] ?? [], error: error?.message }
}

export async function getStoryById(storyId: string): Promise<{ data: Story | null; error?: string }> {
  const { data, error } = await supabase()
    .from('stories')
    .select('*, profile:profiles!stories_user_id_fkey(id, name, photos, is_verified)')
    .eq('id', storyId)
    .maybeSingle()

  return { data: data as Story | null, error: error?.message }
}
