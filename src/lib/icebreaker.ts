import { supabase } from '@/lib/supabase/client'
import type { Mood, LookingFor } from '@/lib/api'

interface IcebreakerInput {
  userId: string
  targetId: string
}

const MOOD_LABELS: Record<Mood, string> = {
  discuter: '💬 discuter',
  rencontre: '🔥 rencontrer',
  disponible_ce_soir: '🍷 être dispo ce soir',
  relation_serieuse: '💕 une relation sérieuse',
  chill: '🎮 chill',
  de_passage: '🌍 de passage',
}

const LOOKING_FOR_LABELS: Record<LookingFor, string> = {
  friendship: 'faire des rencontres amicales',
  casual: 'un plan sans lendemain',
  fwb: 'un plan régulier',
  serious: 'une relation sérieuse',
  open: 'une relation libre',
}

const MOOD_COMPAT: Record<Mood, Mood[]> = {
  discuter: ['discuter', 'chill', 'de_passage'],
  rencontre: ['rencontre', 'disponible_ce_soir', 'relation_serieuse'],
  disponible_ce_soir: ['disponible_ce_soir', 'rencontre', 'relation_serieuse'],
  relation_serieuse: ['relation_serieuse', 'rencontre', 'discuter'],
  chill: ['chill', 'discuter', 'de_passage'],
  de_passage: ['de_passage', 'discuter', 'chill'],
}

const ICEBREAKER_TEMPLATES = [
  // Intérêts partagés
  (myInterests: string[], theirInterests: string[], myMood: Mood, theirMood: Mood, myLF: LookingFor, theirLF: LookingFor, location: string | null): string | null => {
    const shared = myInterests.filter(i => theirInterests.includes(i))
    if (shared.length > 0) {
      const topic = shared[Math.floor(Math.random() * shared.length)]
      const questions = [
        `Vous aimez tous les deux ${topic} ! Quel est ton meilleur souvenir lié à ça ?`,
        `Je vois que ${topic} fait partie de vos passions communes. C'est quoi le truc le plus cool que tu aies fait récemment dans ce domaine ?`,
        `Vous partagez l'amour de ${topic} ! Qu'est-ce qui t'a donné envie de t'y intéresser ?`,
        `Puisque vous aimez tous les deux ${topic}, tu connais des endroits sympas en rapport avec ça dans le coin ?`,
      ]
      return questions[Math.floor(Math.random() * questions.length)]
    }
    return null
  },

  // Mood compatible
  (myInterests: string[], theirInterests: string[], myMood: Mood, theirMood: Mood, myLF: LookingFor, theirLF: LookingFor, location: string | null): string | null => {
    const isCompat = MOOD_COMPAT[myMood]?.includes(theirMood) ?? false
    if (isCompat) {
      if (myMood === theirMood) {
        const sameMood = [
          `Vous êtes tous les deux d'humeur à ${MOOD_LABELS[myMood]}, parfait pour démarrer la conversation !`,
          `Même mood ce soir : ${MOOD_LABELS[myMood]}. C'est le moment idéal pour faire connaissance.`,
        ]
        return sameMood[Math.floor(Math.random() * sameMood.length)]
      }
      const compatMood = [
        `Ton mood ${MOOD_LABELS[myMood]} match bien avec son ${MOOD_LABELS[theirMood]}, belle alchimie !`,
        `Vous avez des moods complémentaires (${MOOD_LABELS[myMood]} / ${MOOD_LABELS[theirMood]}), bonne énergie pour discuter !`,
      ]
      return compatMood[Math.floor(Math.random() * compatMood.length)]
    }
    return null
  },

  // Intentions alignées
  (myInterests: string[], theirInterests: string[], myMood: Mood, theirMood: Mood, myLF: LookingFor, theirLF: LookingFor, location: string | null): string | null => {
    if (myLF === theirLF) {
      const sameLF = [
        `Vous cherchez tous les deux ${LOOKING_FOR_LABELS[myLF]}, c'est un bon point de départ pour discuter !`,
        `Puisque vous avez les mêmes attentes (${LOOKING_FOR_LABELS[myLF]}), qu'est-ce qui est le plus important pour toi dans une relation ?`,
      ]
      return sameLF[Math.floor(Math.random() * sameLF.length)]
    }
    return null
  },

  // Interêt unique chez l'autre
  (myInterests: string[], theirInterests: string[], myMood: Mood, theirMood: Mood, myLF: LookingFor, theirLF: LookingFor, location: string | null): string | null => {
    const unique = theirInterests.filter(i => !myInterests.includes(i))
    if (unique.length > 0) {
      const topic = unique[Math.floor(Math.random() * unique.length)]
      const questions = [
        `Je ne connais pas trop ${topic}, mais ça a l'air cool ! Tu peux m'en dire plus ?`,
        `J'ai vu que tu aimes ${topic}, c'est quelque chose qui te passionne depuis longtemps ?`,
      ]
      return questions[Math.floor(Math.random() * questions.length)]
    }
    return null
  },

  // Location
  (myInterests: string[], theirInterests: string[], myMood: Mood, theirMood: Mood, myLF: LookingFor, theirLF: LookingFor, location: string | null): string | null => {
    if (location) {
      const questions = [
        `Tu es à ${location} ! Tu connais des bons plans dans le coin ?`,
        `Je vois que tu es basé à ${location}, c'est sympa comme endroit ?`,
      ]
      return questions[Math.floor(Math.random() * questions.length)]
    }
    return null
  },
]

export async function generateIcebreaker(input: IcebreakerInput): Promise<{ suggestion: string | null; error?: string }> {
  const { userId, targetId } = input

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, interests, mood, looking_for, location')
    .in('id', [userId, targetId])

  if (!profiles || profiles.length < 2) {
    return { suggestion: null, error: 'Profils introuvables' }
  }

  const myProfile = profiles.find(p => p.id === userId)
  const theirProfile = profiles.find(p => p.id === targetId)
  if (!myProfile || !theirProfile) {
    return { suggestion: null, error: 'Profil introuvable' }
  }

  const myInterests: string[] = myProfile.interests ?? []
  const theirInterests: string[] = theirProfile.interests ?? []
  const myMood: Mood = (myProfile.mood ?? 'discuter') as Mood
  const theirMood: Mood = (theirProfile.mood ?? 'discuter') as Mood
  const myLF: LookingFor = (myProfile.looking_for ?? 'friendship') as LookingFor
  const theirLF: LookingFor = (theirProfile.looking_for ?? 'friendship') as LookingFor
  const location: string | null = theirProfile.location ?? null

  // Mélanger les templates pour varier
  const shuffled = [...ICEBREAKER_TEMPLATES].sort(() => Math.random() - 0.5)

  for (const template of shuffled) {
    const suggestion = template(myInterests, theirInterests, myMood, theirMood, myLF, theirLF, location)
    if (suggestion) {
      return { suggestion }
    }
  }

  // Fallback
  const fallbacks = [
    "Qu'est-ce qui t'a donné envie de rejoindre Erosia ?",
    'Si tu devais décrire ta semaine en un mot, ce serait lequel ?',
    "Quel est le meilleur plan que tu aies fait récemment ?",
    'Plutôt café ou plutôt thé ? :)',
    'Tu as des projets pour ce week-end ?',
  ]
  return { suggestion: fallbacks[Math.floor(Math.random() * fallbacks.length)] }
}
