import type { CriterionDefinition, ProfileSnapshot, CriterionResult } from '../types'

const ACTIVE_MOODS = new Set(['de_passage', 'disponible_ce_soir', 'rencontre'])
const CHILL_MOODS = new Set(['discuter', 'chill', 'relation_serieuse'])

export const lifestyleCriterion: CriterionDefinition = {
  id: 'lifestyle',
  label: 'Style de vie',
  icon: 'Sun',
  weight: 0.15,
  description: 'Rythme de vie et habitudes quotidiennes',
  async calculate(userA: ProfileSnapshot, userB: ProfileSnapshot): Promise<CriterionResult> {
    let score = 50
    const strengths: string[] = []
    const differences: string[] = []
    const tips: string[] = []

    const aActive = userA.mood ? ACTIVE_MOODS.has(userA.mood) : false
    const bActive = userB.mood ? ACTIVE_MOODS.has(userB.mood) : false
    const aChill = userA.mood ? CHILL_MOODS.has(userA.mood) : false
    const bChill = userB.mood ? CHILL_MOODS.has(userB.mood) : false

    if (aActive && bActive) {
      score += 20
      strengths.push('Vous êtes tous les deux dynamiques et prêts à sortir')
    } else if (aChill && bChill) {
      score += 20
      strengths.push('Vous appréciez tous les deux les moments calmes et posés')
    } else if (aActive && bChill) {
      score -= 5
      differences.push('L\'un est plus actif, l\'autre préfère le calme — trouvez votre équilibre')
      tips.push('Alternez entre sorties et soirées cocooning pour combler vos deux besoins')
    }

    const aEnergy = userA.energy_score ?? 50
    const bEnergy = userB.energy_score ?? 50
    const energyDiff = Math.abs(aEnergy - bEnergy)

    if (energyDiff <= 10) {
      score += 10
      strengths.push('Vos niveaux d\'énergie sont parfaitement alignés')
    } else if (energyDiff <= 25) {
      score += 5
    } else {
      differences.push('Vos rythmes de vie sont assez différents')
      tips.push('Respectez le besoin de rythme de chacun sans vouloir changer l\'autre')
    }

    const sharedTraits = userA.traits.filter((t) => userB.traits.includes(t))
    if (sharedTraits.includes('aventurier') || sharedTraits.includes('curieux')) {
      score += 10
      strengths.push('Vous aimez explorer et sortir de votre zone de confort')
    }

    return { score: Math.min(100, Math.max(0, score)), strengths, differences, tips }
  },
}
