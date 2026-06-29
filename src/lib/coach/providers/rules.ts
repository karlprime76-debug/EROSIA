import type { CoachResult, ProfileInput, Suggestion } from '../types'

const COMMON_CLICHES = [
  'j\'aime voyager', 'i love travel', 'voyages', 'travel',
  'j\'aime rire', 'i love to laugh', 'laugh',
  'carpe diem', 'live laugh love',
  'je cherche mon âme sœur', 'soulmate',
  'je suis cool', 'i\'m chill',
  'j\'aime la vie', 'love life',
  'foodie',
  'aventure', 'adventure',
  'famille', 'amis', 'family', 'friends',
  'musique', 'music',
  'cinéma', 'cinema', 'movies', 'film',
  'sport',
  'cuisiner', 'cooking', 'cuisine',
  'sortir', 'going out',
  'nouvelle rencontre', 'new people',
  'découvrir', 'discover',
  'passer du temps', 'spend time',
  'bonne humeur', 'good mood',
  'simplicité', 'simplicity',
  'profiter', 'enjoy',
  'voyager', 'traveling',
  'nature',
  'photographie', 'photography',
  'lecture', 'reading',
  'anime', 'manga',
  'jeux vidéo', 'video games', 'gaming',
  'fitness',
  'yoga',
  'méditation', 'meditation',
  'plage', 'beach',
  'montagne', 'mountain',
  ' café', ' coffee',
  ' thé', ' tea',
  'vin', ' wine',
  'bière', ' beer',
  'brunch',
  'manger', 'eating',
  'dormir', 'sleeping',
]

function countCliches(bio: string): number {
  const lower = bio.toLowerCase()
  return COMMON_CLICHES.filter(c => lower.includes(c)).length
}

function analyzePhotos(p: ProfileInput): Suggestion[] {
  const suggestions: Suggestion[] = []
  const count = p.photos?.length ?? 0

  if (count === 0) {
    suggestions.push({
      type: 'photo',
      severity: 'warning',
      title: 'Aucune photo',
      description: 'Les profils avec au moins une photo reçoivent significativement plus de matchs.',
      field: 'photos',
    })
  } else {
    if (count < 3) {
      suggestions.push({
        type: 'photo',
        severity: 'warning',
        title: 'Ajoute plus de photos',
        description: `Tu n'as que ${count} photo${count > 1 ? 's' : ''}. Les profils avec 3+ photos reçoivent jusqu'à 3× plus de likes.`,
        field: 'photos',
      })
    }
    if (count >= 2) {
      suggestions.push({
        type: 'photo',
        severity: 'tip',
        title: 'Varie tes photos',
        description: 'Altern plans rapprochés, corps entier, activités — ça donne une image plus complète de toi.',
        field: 'photos',
      })
    }
    if (p.video_url) {
      suggestions.push({
        type: 'photo',
        severity: 'info',
        title: 'Vidéo de profil 👍',
        description: 'Un profil vidéo augmente l\'engagement. Assure-toi qu\'elle soit bien éclairée et récente.',
        field: 'video_url',
      })
    }
  }

  return suggestions
}

function analyzeBio(p: ProfileInput): Suggestion[] {
  const suggestions: Suggestion[] = []
  const bio = p.bio?.trim()

  if (!bio) {
    suggestions.push({
      type: 'bio',
      severity: 'warning',
      title: 'Bio vide',
      description: 'Une bio courte mais personnelle aide à démarrer une conversation. Partage un truc unique sur toi.',
      field: 'bio',
    })
    return suggestions
  }

  const wordCount = bio.split(/\s+/).length

  if (wordCount < 10) {
    suggestions.push({
      type: 'bio',
      severity: 'warning',
      title: 'Bio trop courte',
      description: `Seulement ${wordCount} mots. Vise 30-60 mots pour donner envie sans lasser.`,
      field: 'bio',
    })
  } else if (wordCount > 100) {
    suggestions.push({
      type: 'bio',
      severity: 'tip',
      title: 'Bio un peu longue',
      description: `${wordCount} mots, c'est long. Essaie de resserrer pour garder l'attention.`,
      field: 'bio',
    })
  }

  const clicheCount = countCliches(bio)
  if (clicheCount >= 3) {
    suggestions.push({
      type: 'bio',
      severity: 'warning',
      title: 'Trop de clichés',
      description: 'Évite les phrases trop génériques. Remplace-les par des détails concrets qui te sont propres.',
      field: 'bio',
    })
  }

  const hasEmoji = /[\p{Emoji}]/u.test(bio)
  if (!hasEmoji) {
    suggestions.push({
      type: 'bio',
      severity: 'tip',
      title: 'Ajoute un emoji',
      description: 'Un ou deux emojis bien placés rendent la bio plus vivante et accessible.',
      field: 'bio',
    })
  }

  return suggestions
}

function analyzeInterests(p: ProfileInput): Suggestion[] {
  const suggestions: Suggestion[] = []
  const interests = p.interests ?? []
  const count = interests.length

  if (count === 0) {
    suggestions.push({
      type: 'interests',
      severity: 'warning',
      title: 'Aucun centre d\'intérêt',
      description: 'Ajoute au moins 3-5 centres d\'intérêt pour augmenter ta compatibilité avec d\'autres profils.',
      field: 'interests',
    })
  } else if (count < 3) {
    suggestions.push({
      type: 'interests',
      severity: 'warning',
      title: 'Peu de centres d\'intérêt',
      description: `Seulement ${count}. Ajoutes-en quelques-uns pour mieux refléter ta personnalité.`,
      field: 'interests',
    })
  } else if (count > 15) {
    suggestions.push({
      type: 'interests',
      severity: 'tip',
      title: 'Beaucoup d\'intérêts',
      description: `${count} intérêts, c'est bien. Assure-toi que les principaux soient en haut de la liste.`,
      field: 'interests',
    })
  }

  return suggestions
}

function analyzeGeneral(p: ProfileInput): { suggestions: Suggestion[]; strengths: string[] } {
  const suggestions: Suggestion[] = []
  const strengths: string[] = []

  if (!p.occupation) {
    suggestions.push({
      type: 'general',
      severity: 'info',
      title: 'Ajoute ton occupation',
      description: 'Partager ton métier ou domaine d\'étude donne un premier sujet de conversation.',
      field: 'occupation',
    })
  } else {
    strengths.push('Occupation remplie')
  }

  if (!p.location) {
    suggestions.push({
      type: 'general',
      severity: 'tip',
      title: 'Indique ta ville',
      description: 'Ajouter ta localisation aide à trouver des personnes proches de toi.',
      field: 'location',
    })
  } else {
    strengths.push('Localisation renseignée')
  }

  if (p.is_verified) {
    strengths.push('Profil vérifié')
  } else {
    suggestions.push({
      type: 'general',
      severity: 'info',
      title: 'Vérifie ton profil',
      description: 'Les profils vérifiés inspirent plus confiance. Passe la vérification dans les paramètres.',
      field: 'is_verified',
    })
  }

  const photoCount = p.photos?.length ?? 0
  if (photoCount >= 3 && p.bio && (p.interests?.length ?? 0) >= 3) {
    strengths.push('Profil bien complété')
  }

  return { suggestions, strengths }
}

function computeScore(p: ProfileInput): number {
  let score = 0
  let max = 0

  // Photos: 0-30 points
  max += 30
  const pc = p.photos?.length ?? 0
  score += Math.min(pc * 10, 30)

  // Bio: 0-25 points
  max += 25
  const bio = p.bio?.trim()
  if (bio) {
    const wc = bio.split(/\s+/).length
    if (wc >= 10) score += 15
    else score += 10
    if (!countCliches(bio)) score += 10
    else if (countCliches(bio) < 3) score += 5
  }

  // Interests: 0-20 points
  max += 20
  const ic = p.interests?.length ?? 0
  score += Math.min(ic * 4, 20)

  // General: 0-25 points
  max += 25
  if (p.occupation) score += 8
  if (p.location) score += 7
  if (p.is_verified) score += 10

  return Math.round((score / max) * 100)
}

export async function analyze(p: ProfileInput): Promise<CoachResult> {
  const photoHints = analyzePhotos(p)
  const bioHints = analyzeBio(p)
  const interestHints = analyzeInterests(p)
  const { suggestions: generalHints, strengths } = analyzeGeneral(p)

  const suggestions = [...photoHints, ...bioHints, ...interestHints, ...generalHints]
  const score = computeScore(p)

  const summary =
    score >= 80
      ? 'Ton profil est en excellente forme ! Quelques petits ajustements pour le rendre parfait.'
      : score >= 60
        ? 'Bon profil ! Voici quelques pistes pour le rendre encore plus attirant.'
        : score >= 40
          ? 'Profil correct — mais il y a du potentiel inexploité. Suis ces conseils pour décrocher plus de matchs.'
          : 'Ton profil a besoin d\'un coup de boost. Applique ces suggestions pour le transformer.'

  return { score, summary, suggestions, strengths }
}
