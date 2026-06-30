import type { CriterionDefinition, ProfileSnapshot, CriterionResult } from '../types'

const CAREER_KEYWORDS = ['carrière', 'travail', 'entreprise', 'projet', 'ambition', 'carrier', 'work', 'business']
const FAMILY_KEYWORDS = ['famille', 'enfant', 'foyer', 'family', 'home']
const ADVENTURE_KEYWORDS = ['voyage', 'aventure', 'découvrir', 'explorer', 'travel', 'adventure', 'nature']
const FREEDOM_KEYWORDS = ['liberté', 'indépendance', 'spontané', 'freedom', 'indépendant']

function matchKeywords(text: string, keywords: string[]): number {
  const lower = text.toLowerCase()
  return keywords.filter((k) => lower.includes(k)).length
}

export const valuesCriterion: CriterionDefinition = {
  id: 'values',
  label: 'Valeurs',
  icon: 'Shield',
  weight: 0.2,
  description: 'Valeurs fondamentales et priorités de vie',
  async calculate(userA: ProfileSnapshot, userB: ProfileSnapshot): Promise<CriterionResult> {
    let score = 50
    const strengths: string[] = []
    const differences: string[] = []
    const tips: string[] = []

    const bioA = userA.bio ?? ''
    const bioB = userB.bio ?? ''

    const aCareer = matchKeywords(bioA, CAREER_KEYWORDS)
    const bCareer = matchKeywords(bioB, CAREER_KEYWORDS)
    const aFamily = matchKeywords(bioA, FAMILY_KEYWORDS)
    const bFamily = matchKeywords(bioB, FAMILY_KEYWORDS)
    const aAdventure = matchKeywords(bioA, ADVENTURE_KEYWORDS)
    const bAdventure = matchKeywords(bioB, ADVENTURE_KEYWORDS)
    const aFreedom = matchKeywords(bioA, FREEDOM_KEYWORDS)
    const bFreedom = matchKeywords(bioB, FREEDOM_KEYWORDS)

    if (Math.abs(aCareer - bCareer) <= 1) {
      score += 10
      if (aCareer > 0) strengths.push('Vous partagez une vision commune du travail et de l\'ambition')
    } else {
      differences.push('Vos priorités professionnelles sont différentes')
      tips.push('Parlez de vos ambitions pour trouver un équilibre')
    }

    if (Math.abs(aFamily - bFamily) <= 1) {
      score += 10
      if (aFamily > 0) strengths.push('La famille est importante pour vous deux')
    } else {
      differences.push('Vous n\'avez pas la même vision de la famille')
      tips.push('Discutez de vos attentes familiales tôt dans la relation')
    }

    if (Math.abs(aAdventure - bAdventure) <= 1 && Math.abs(aFreedom - bFreedom) <= 1) {
      score += 10
      if (aAdventure > 0 || aFreedom > 0) strengths.push('Vous partagez un amour commun pour l\'aventure et la liberté')
    }

    if (userA.occupation && userB.occupation) {
      score += 10
      strengths.push('Vous avez tous les deux une activité professionnelle')
    } else if (!userA.occupation && !userB.occupation) {
      tips.push('Explorez ensemble ce qui vous motive au quotidien')
    }

    if (aCareer > 0 && bFamily > 0) {
      tips.push('Trouvez un terrain d\'entente entre carrière et vie de famille')
    }

    return { score: Math.min(100, Math.max(0, score)), strengths, differences, tips }
  },
}
