import { supabase } from '@/lib/supabase/client'

interface SuggestionInput {
  userId: string
  targetId: string
  matchId: string
}

const QUESTION_ANSWERS: { pattern: RegExp; answers: string[] }[] = [
  { pattern: /comment.*vas|ça va/i, answers: ['Ça va super et toi ?', 'Ça va bien, tranquille ! Et toi ?', "Je profite, merci ! Et toi comment tu vas ?"] },
  { pattern: /quoi.*faire|tu fais|occupé/i, answers: ['Rien de spécial, je me détends', 'Je regarde une série, et toi ?', 'Je travaille un peu, mais je préfère discuter avec toi 😄'] },
  { pattern: /week.?end|projet|prévu/i, answers: ['Rien de prévu, tu proposes quelque chose ?', 'Je suis libre, on pourrait se voir si tu veux !', 'Pas grand chose, tu veux qu\'on organise quelque chose ?'] },
  { pattern: /ou.*habites|où.*vis|quartier/i, answers: ['Je suis dans le coin, on est proches !', 'Je suis pas très loin justement', 'Je suis à côté ! On pourrait se rencontrer'] },
  { pattern: /loisir|passion|sport|intérêt/i, answers: ['Je suis curieux/se d\'en savoir plus sur toi', 'Raconte-moi, ça m\'intéresse !', 'C\'est cool, comment t\'as commencé ?'] },
  { pattern: /voyag|voyagé|allé.*endroit|visiter/i, answers: ['J\'adorerais y aller un jour !', 'Tu me donnes envie d\'y aller !', 'Ça a l\'air incroyable ! C\'était quand ?'] },
  { pattern: /mangé|cuisi|restau|plat/i, answers: ['Tu aimes quoi comme cuisine ?', 'Il faut qu\'on aille manger ensemble !', 'Je suis plutôt [plat], et toi ?'] },
  { pattern: /film|serie|netflix|ciné/i, answers: ['Tu me recommandes ?', 'J\'ai adoré ! T\'as vu le dernier épisode ?', 'On devrait regarder ensemble un de ces jours'] },
  { pattern: /musique|groupe|concert/i, answers: ['J\'écoute de tout, mais mon genre préféré c\'est...', 'On a les mêmes goûts !', 'Tu écoutes quoi en ce moment ?'] },
]

const FOLLOW_UPS = [
  'Tu fais quoi de beau aujourd\'hui ?',
  'Raconte-moi une anecdote marrante',
  'Si tu pouvais voyager demain, où irais-tu ?',
  'Ton film préféré et pourquoi ?',
  'Plutôt soirée tranquille ou sortie ?',
  'Quel est ton plus grand rêve ?',
  'Un super-pouvoir que tu aimerais avoir ?',
  'Le meilleur conseil qu\'on t\'ait donné ?',
  'Quelle est ta plus grande fierté ?',
  'Si tu gagnais au loto, tu ferais quoi ?',
]

const STALE_CONVERSATION = [
  'Ça faisait longtemps ! Tu deviens quoi ?',
  'Je pensais à toi ! Comment tu vas ?',
  'Re-coucou ! Toujours en vie ? 😄',
  'J\'espère que ta journée se passe bien !',
  'Il est où le feu ? 😄',
]

const INTEREST_RESPONSES: Record<string, string[]> = {
  cuisine: ['Tu aimes cuisiner ? Quel est ton plat signature ?', 'On devrait cuisiner ensemble un jour !'],
  sport: ['Tu fais du sport ? Lequel tu préfères ?', 'On pourrait faire une séance sport ensemble !'],
  musique: ['Tu écoutes quoi comme musique en ce moment ?', 'On partage nos playlists ?'],
  voyage: ['Ton plus beau voyage ?', 'Prochaine destination de rêve ?'],
  cinéma: ['Ton film préféré ?', 'On regarde un film ensemble ?'],
  lecture: ['Tu lis quoi en ce moment ?', 'Tu me conseilles un livre ?'],
  art: ['Tu fais de l\'art ou tu aimes contempler ?', 'Ton artiste préféré ?'],
  nature: ['Tu préfères la montagne ou la mer ?', 'Une balade en nature ça te dit ?'],
  animaux: ['Tu as des animaux ?', 'Plutôt chat ou chien ?'],
  jeux: ['Tu joues à quoi ?', 'On fait une partie ?'],
}

export async function generateMessageSuggestions(input: SuggestionInput): Promise<{ suggestions: string[]; error?: string }> {
  const { userId, targetId, matchId } = input

  const { data: messages, error: msgErr } = await supabase
    .from('messages')
    .select('text, sender_id, created_at')
    .eq('match_id', matchId)
    .not('text', 'is', null)
    .order('created_at', { ascending: false })
    .limit(6)

  if (msgErr) return { suggestions: [], error: msgErr.message }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, interests, mood, looking_for')
    .in('id', [userId, targetId])

  const myProfile = profiles?.find(p => p.id === userId)
  const theirProfile = profiles?.find(p => p.id === targetId)
  const myInterests: string[] = (myProfile?.interests ?? []) as string[]
  const theirInterests: string[] = (theirProfile?.interests ?? []) as string[]
  const sharedInterests = myInterests.filter(i => theirInterests.includes(i))

  const suggestions: string[] = []
  const added = new Set<string>()

  const add = (s: string) => {
    const key = s.toLowerCase().replace(/[?.!,\s]/g, '')
    if (!added.has(key) && suggestions.length < 4) {
      added.add(key)
      suggestions.push(s)
    }
  }

  const lastMsg = messages && messages.length > 0 ? messages[0] : null
  const theirLastMsg = lastMsg?.sender_id === targetId ? lastMsg : null
  const myLastMsg = lastMsg?.sender_id === userId ? lastMsg : null

  const hoursSinceLast = lastMsg
    ? (Date.now() - new Date(lastMsg.created_at).getTime()) / (1000 * 60 * 60)
    : 999

  if (!lastMsg) {
    if (sharedInterests.length > 0) {
      const topic = sharedInterests[Math.floor(Math.random() * sharedInterests.length)]
      const responses = INTEREST_RESPONSES[topic]
      if (responses) {
        add(responses[0])
      }
    }
    add('Salut ! Comment va ?')
    add('Coucou ! Ravi(e) de te rencontrer 😊')
    if (theirInterests.length > 0) {
      add(`Je vois que tu aimes ${theirInterests[0]}, c'est cool !`)
    }
    return { suggestions }
  }

  if (theirLastMsg) {
    const text = theirLastMsg.text ?? ''
    const isQuestion = text.includes('?')

    if (isQuestion) {
      for (const { pattern, answers } of QUESTION_ANSWERS) {
        if (pattern.test(text)) {
          add(answers[Math.floor(Math.random() * answers.length)])
          break
        }
      }
      if (!added.size) {
        add('Bonne question ! Laisse-moi réfléchir...')
      }
    }

    if (text.length > 20 && !isQuestion) {
      add('C\'est intéressant ! Raconte m\'en plus')
      add('Je vois ! Et qu\'est-ce qui t\'a donné envie de faire ça ?')
    }

    if (sharedInterests.length > 0 && suggestions.length < 3) {
      const topic = sharedInterests[Math.floor(Math.random() * sharedInterests.length)]
      const rasa = INTEREST_RESPONSES[topic]
      if (rasa) {
        add(rasa[Math.floor(Math.random() * rasa.length)])
      }
    }
  }

  if (myLastMsg && hoursSinceLast > 2) {
    add('Toujours là ? 😄')
    add('Je relance au cas où !')
  }

  if (hoursSinceLast > 24) {
    add(STALE_CONVERSATION[Math.floor(Math.random() * STALE_CONVERSATION.length)])
  }

  if (suggestions.length === 0) {
    if (sharedInterests.length > 0) {
      const topic = sharedInterests[Math.floor(Math.random() * sharedInterests.length)]
      const rasa = INTEREST_RESPONSES[topic]
      if (rasa) add(rasa[Math.floor(Math.random() * rasa.length)])
    }
    while (suggestions.length < 3) {
      const f = FOLLOW_UPS[Math.floor(Math.random() * FOLLOW_UPS.length)]
      add(f)
    }
  }

  return { suggestions }
}
