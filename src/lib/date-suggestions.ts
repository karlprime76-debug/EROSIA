import { supabase } from '@/lib/supabase/client'
import type { Mood, LookingFor } from '@/lib/api'

export interface DateSuggestion {
  type: string
  budget: string
  distance: string
  description: string
}

interface DateInput {
  userId: string
  targetId: string
}

const BUDGETS = ['€', '€€', '€€€'] as const

const MOOD_VIBE: Record<Mood, 'chill' | 'romantic' | 'active' | 'social'> = {
  discuter: 'chill',
  rencontre: 'social',
  disponible_ce_soir: 'social',
  relation_serieuse: 'romantic',
  chill: 'chill',
  de_passage: 'active',
}

const INTEREST_ACTIVITY: Record<string, { type: string; budget: typeof BUDGETS[number]; description: string }> = {
  cuisine: { type: 'restaurant', budget: '€€', description: 'Un restaurant pour explorer vos papilles ensemble' },
  voyage: { type: 'café', budget: '€', description: 'Un café pour échanger sur vos voyages et vos prochaines destinations' },
  sport: { type: 'activité', budget: '€', description: 'Une activité sportive pour partager un moment dynamique' },
  musique: { type: 'bar', budget: '€€', description: 'Un bar avec musique live pour une ambiance détendue' },
  art: { type: 'musée', budget: '€', description: 'Une galerie ou un musée pour une sortie culturelle' },
  cinéma: { type: 'cinéma', budget: '€€', description: 'Un film à voir ensemble, parfait pour lancer la discussion' },
  nature: { type: 'parc', budget: '€', description: 'Une balade dans un parc ou un jardin pour un rendez-vous au calme' },
  lecture: { type: 'café', budget: '€', description: 'Un café littéraire pour partager vos lectures' },
  jeux: { type: 'activité', budget: '€€', description: 'Un salon de jeux pour une ambiance fun et décontractée' },
  danse: { type: 'bar', budget: '€€', description: 'Un bar ou une soirée danse pour vous ambiancer' },
  photo: { type: 'parc', budget: '€', description: 'Une promenade photo dans un quartier pittoresque' },
  animaux: { type: 'parc', budget: '€', description: 'Un parc ou un zoo pour une sortie légère et sympa' },
}

const DEFAULT_SUGGESTIONS: DateSuggestion[] = [
  { type: 'café', budget: '€', distance: '< 1 km', description: 'Un café cosy pour faire connaissance en toute simplicité' },
  { type: 'parc', budget: '€', distance: '< 2 km', description: 'Une balade au parc pour un rendez-vous décontracté' },
  { type: 'restaurant', budget: '€€', distance: '< 3 km', description: 'Un bon restaurant pour partager un repas' },
]

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function generateDateSuggestions(input: DateInput): Promise<{ suggestions: DateSuggestion[]; error?: string }> {
  const { userId, targetId } = input

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, interests, mood, looking_for, location, latitude, longitude')
    .in('id', [userId, targetId])

  if (!profiles || profiles.length < 2) {
    return { suggestions: DEFAULT_SUGGESTIONS, error: 'Profils introuvables' }
  }

  const myProfile = profiles.find(p => p.id === userId)
  const theirProfile = profiles.find(p => p.id === targetId)
  if (!myProfile || !theirProfile) {
    return { suggestions: DEFAULT_SUGGESTIONS, error: 'Profil introuvable' }
  }

  const myInterests: string[] = myProfile.interests ?? []
  const theirInterests: string[] = theirProfile.interests ?? []
  const shared = myInterests.filter(i => theirInterests.includes(i))
  const myMood = (myProfile.mood ?? 'discuter') as Mood
  const theirMood = (theirProfile.mood ?? 'discuter') as Mood
  const myLF = (myProfile.looking_for ?? 'friendship') as LookingFor
  const theirLF = (theirProfile.looking_for ?? 'friendship') as LookingFor

  let distance: string
  if (myProfile.latitude && myProfile.longitude && theirProfile.latitude && theirProfile.longitude) {
    const d = haversineKm(myProfile.latitude, myProfile.longitude, theirProfile.latitude, theirProfile.longitude)
    if (d < 1) distance = '< 1 km'
    else if (d < 5) distance = `${Math.round(d)} km`
    else distance = '+ de 5 km'
  } else {
    distance = theirProfile.location ? `< ${theirProfile.location}` : 'Distance non précisée'
  }

  const suggestions: DateSuggestion[] = []

  // 1. Based on shared interests
  if (shared.length > 0) {
    const topic = pick(shared)
    const activity = INTEREST_ACTIVITY[topic.toLowerCase()]
    if (activity) {
      suggestions.push({ ...activity, distance })
    }
  }

  // 2. Based on mood/looking_for combination
  const vibe1 = MOOD_VIBE[myMood] ?? 'chill'
  const vibe2 = MOOD_VIBE[theirMood] ?? 'chill'

  if (vibe1 === 'romantic' || vibe2 === 'romantic' || myLF === 'serious' || theirLF === 'serious') {
    suggestions.push(
      { type: 'restaurant', budget: pick(['€€', '€€€']), distance, description: 'Un dîner aux chandelles pour une ambiance romantique' },
      { type: 'activité', budget: '€€', distance, description: 'Une dégustation de vins ou un cours de cuisine en duo' },
    )
  }

  if (vibe1 === 'active' || vibe2 === 'active') {
    suggestions.push(
      { type: 'activité', budget: '€', distance, description: 'Une randonnée ou une balade à vélo pour les amateurs de plein air' },
      { type: 'activité', budget: '€€', distance, description: 'Un escape game ou un laser game pour un moment fun' },
    )
  }

  if (vibe1 === 'chill' || vibe2 === 'chill' || myLF === 'friendship' || theirLF === 'friendship') {
    suggestions.push(
      { type: 'café', budget: '€', distance, description: 'Un café tranquille pour discuter en toute liberté' },
      { type: 'parc', budget: '€', distance, description: 'Un pique-nique ou une balade dans un parc' },
    )
  }

  if (vibe1 === 'social' || vibe2 === 'social') {
    suggestions.push(
      { type: 'bar', budget: '€€', distance, description: 'Un bar animé pour boire un verre dans une ambiance décontractée' },
      { type: 'activité', budget: '€€', distance, description: 'Un bowling ou un billard pour une soirée entre célibataires' },
    )
  }

  // 3. Interest-specific fallback
  if (theirInterests.length > 0) {
    const theirTopic = pick(theirInterests)
    const theirActivity = INTEREST_ACTIVITY[theirTopic.toLowerCase()]
    if (theirActivity && !suggestions.some(s => s.type === theirActivity.type)) {
      suggestions.push({ ...theirActivity, distance })
    }
  }

  // 4. Shuffle + cap to 3
  const shuffled = suggestions.sort(() => Math.random() - 0.5).slice(0, 3)

  if (shuffled.length === 0) {
    return { suggestions: DEFAULT_SUGGESTIONS.map(s => ({ ...s, distance })) }
  }

  return { suggestions: shuffled }
}
