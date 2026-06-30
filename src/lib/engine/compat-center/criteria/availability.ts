import type { CriterionDefinition, ProfileSnapshot, CriterionResult } from '../types'

export const availabilityCriterion: CriterionDefinition = {
  id: 'availability',
  label: 'Disponibilités',
  icon: 'Calendar',
  weight: 0.1,
  description: 'Disponibilité émotionnelle et temporelle',
  async calculate(userA: ProfileSnapshot, userB: ProfileSnapshot): Promise<CriterionResult> {
    let score = 50
    const strengths: string[] = []
    const differences: string[] = []
    const tips: string[] = []

    const availableNow = new Set(['disponible_ce_soir', 'rencontre'])
    const slowBurn = new Set(['relation_serieuse', 'discuter', 'chill'])

    const aAvail = userA.mood ? availableNow.has(userA.mood) : false
    const bAvail = userB.mood ? availableNow.has(userB.mood) : false
    const aSlow = userA.mood ? slowBurn.has(userA.mood) : false
    const bSlow = userB.mood ? slowBurn.has(userB.mood) : false

    if (aAvail && bAvail) {
      score += 20
      strengths.push('Vous êtes tous les deux disponibles et prêts à vivre de belles rencontres')
    } else if (aSlow && bSlow) {
      score += 20
      strengths.push('Vous prenez tous les deux le temps de construire quelque chose de solide')
    } else {
      score -= 5
      differences.push('Vos disponibilités ne sont pas alignées pour le moment')
      tips.push('Communiquez sur vos attentes en termes de temps à consacrer à la relation')
    }

    if (userA.location && userB.location) {
      const sameCity = userA.location.toLowerCase() === userB.location.toLowerCase()
      if (sameCity) {
        score += 15
        strengths.push('Vous êtes dans la même ville — organiser des rencontres sera facile')
      } else {
        score += 5
        tips.push('La distance peut être une opportunité de construire une connexion profonde avant de se voir')
      }
    }

    const hasBio = (userA.bio?.length ?? 0) > 20 && (userB.bio?.length ?? 0) > 20
    if (hasBio) {
      score += 10
      strengths.push('Vous investissez du temps dans votre profil — signe de sincérité')
    }

    return { score: Math.min(100, Math.max(0, score)), strengths, differences, tips }
  },
}
