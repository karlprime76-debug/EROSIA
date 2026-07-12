'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { ArrowLeft, Crown, Check, X as XIcon, Sparkles, Eye, MapPin, Brain, Star, Heart, Shield, BarChart3, Zap, Undo2, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createCheckoutSession, getSubscriptionStatus } from '@/lib/api'
import { useToast } from '@/components/Toast'

type Tier = 'free' | 'premium'
type PlanId = 'free' | 'premium_monthly' | 'premium_yearly'

interface Plan {
  id: PlanId
  name: string
  price: string
  period: string
  priceCfa: number
  popular?: boolean
  saveBadge?: string
  features: string[]
  cta: string
}

const plans: Plan[] = [
  {
    id: 'free', name: 'Gratuit', price: '0', period: '/mois', priceCfa: 0,
    features: ['20 swipes par jour', '1 super like par jour', 'Profils de base', 'Chat avec tes matchs', 'Stories'],
    cta: 'Actuel',
  },
  {
    id: 'premium_monthly', name: 'Premium Mensuel', price: '5 000', period: '/mois', priceCfa: 5000, popular: true,
    features: ['Swipes illimités', 'Ghost Mode', 'Mode Voyage', 'Voir qui t\'a liké', 'Filtres avancés', 'Badge Premium', 'Retour sur profil ignoré', 'Boost de visibilité', 'Statistiques avancées', 'Likes illimités'],
    cta: 'S\'abonner',
  },
  {
    id: 'premium_yearly', name: 'Premium Annuel', price: '50 000', period: '/an', priceCfa: 50000, saveBadge: 'Économise 17%',
    features: ['Tous les avantages Premium', 'Économise 10 000 F CFA', 'Badge Premium exclusif', 'Assistance prioritaire', 'Priorité dans les résultats'],
    cta: 'S\'abonner',
  },
]

const comparisonFeatures = [
  { name: 'Swipes par jour', free: '20', premium: 'Illimités', yearly: 'Illimités' },
  { name: 'Super likes', free: '1/jour', premium: 'Illimités', yearly: 'Illimités' },
  { name: 'Ghost Mode', free: false, premium: true, yearly: true },
  { name: 'Mode Voyage', free: false, premium: true, yearly: true },
  { name: 'Voir qui t\'a liké', free: false, premium: true, yearly: true },
  { name: 'Filtres avancés', free: false, premium: true, yearly: true },
  { name: 'Badge Premium', free: false, premium: true, yearly: true },
  { name: 'Boost de visibilité', free: false, premium: true, yearly: true },
  { name: 'Statistiques avancées', free: false, premium: true, yearly: true },
  { name: 'Retour profil ignoré', free: false, premium: true, yearly: true },
  { name: 'Assistance prioritaire', free: false, premium: false, yearly: true },
  { name: 'Priorité résultats', free: false, premium: false, yearly: true },
]

const premiumFeatures = [
  { icon: Sparkles, label: 'Swipes illimités', desc: 'Fini la limite de 20 swipes par jour' },
  { icon: Eye, label: 'Ghost Mode', desc: 'Navigue anonymement sans être vu' },
  { icon: MapPin, label: 'Mode Voyage', desc: 'Change ta localisation où tu veux' },
  { icon: Star, label: 'Voir les likes', desc: 'Sait qui t\'a liké avant de swiper' },
  { icon: Zap, label: 'Boost de visibilité', desc: 'Apparaît plus souvent en haut des résultats' },
  { icon: BarChart3, label: 'Stats avancées', desc: 'Analyse complète de ton profil' },
  { icon: Heart, label: 'Likes illimités', desc: 'Like autant de profils que tu veux' },
  { icon: Undo2, label: 'Retour sur ignoré', desc: 'Revois les profils que tu as ignorés' },
  { icon: Brain, label: 'Quiz compatibilité', desc: 'Trouve l\'âme sœur avec le quiz' },
  { icon: TrendingUp, label: 'Filtres avancés', desc: 'Recherche par centres d\'intérêt, taille, etc.' },
  { icon: Shield, label: 'Badge Premium', desc: 'Montre ton statut Premium' },
  { icon: Crown, label: 'Assistance prioritaire', desc: 'Support dédié et prioritaire' },
]

export default function SubscriptionsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentTier, setCurrentTier] = useState<Tier>('free')
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null)
  const isPremium = currentTier === 'premium'

  useEffect(() => {
    getSubscriptionStatus().then(s => {
      setCurrentTier(s.tier)
      setLoading(false)
    }).catch(() => setLoading(false))
    import('@/lib/supabase/client').then(({ supabase }) => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return
        supabase.from('profiles').select('premium_expires_at').eq('id', user.id).maybeSingle().then(({ data }) => {
          if (data?.premium_expires_at) setExpiresAt(data.premium_expires_at)
        })
      })
    })
  }, [])

  const handleUpgrade = useCallback(async (planId: PlanId) => {
    if (planId === 'free' || isPremium) return
    setUpgrading(true)
    setSelectedPlan(planId)
    const plan = planId === 'premium_yearly' ? 'yearly' : 'monthly'
    const { url, error } = await createCheckoutSession(plan)
    if (error) { toast(error, 'error'); setUpgrading(false); setSelectedPlan(null); return }
    if (url) window.location.href = url
    setUpgrading(false)
  }, [toast, isPremium])

  const remainingDays = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  const getCurrentPlanId = (): PlanId => {
    if (!isPremium) return 'free'
    return 'premium_monthly'
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.push('/gifts')} aria-label="Retour" className="p-2.5 rounded-xl"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Abonnements</h2>
      </header>
      <div className="flex-1 px-4 pb-8 overflow-y-auto space-y-6">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-6"
        >
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--primary), #FF6B35)' }}>
              <Crown size={32} className="text-white" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1"
            >
              <Sparkles size={16} className="text-yellow-400" />
            </motion.div>
          </div>
          <h1 className="text-2xl font-black mb-2">Passe à Premium</h1>
          <p className="text-sm text-secondary max-w-xs mx-auto">Débloque toutes les fonctionnalités d&apos;Erosia</p>
        </motion.div>

        {isPremium && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-4 flex items-center gap-3 border border-[var(--successVibrant)]/20"
          >
            <div className="w-10 h-10 rounded-full bg-[var(--successVibrant)]/15 flex items-center justify-center shrink-0">
              <Crown size={18} className="text-[var(--successVibrant)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Premium actif</p>
              <p className="text-xs text-secondary">
                {remainingDays > 0 ? `${remainingDays} jour${remainingDays > 1 ? 's' : ''} restant${remainingDays > 1 ? 's' : ''}` : 'Tous les avantages débloqués'}
              </p>
            </div>
          </motion.div>
        )}

        <div className="space-y-3">
          {plans.map((plan, i) => {
            const isCurrent = plan.id === getCurrentPlanId()
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`glass-card rounded-2xl p-5 relative transition-all duration-200 ${
                  plan.popular ? 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--bg)]' : ''
                } ${isCurrent ? 'border border-[var(--successVibrant)]/30' : ''}`}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg"
                    style={{ background: 'linear-gradient(135deg, var(--primary), #FF6B35)', color: 'white' }}>
                    Plus populaire
                  </span>
                )}
                {plan.saveBadge && (
                  <span className="absolute -top-2.5 right-4 px-3 py-0.5 rounded-full text-[10px] font-bold shadow-lg"
                    style={{ background: 'color-mix(in srgb, var(--successVibrant) 15%, transparent)', color: 'var(--successVibrant)' }}>
                    {plan.saveBadge}
                  </span>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-black">{plan.price}</span>
                      <span className="text-sm text-secondary">F{plan.period}</span>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[var(--successVibrant)]/15 text-[var(--successVibrant)]">
                      Actuel
                    </span>
                  )}
                </div>
                <ul className="space-y-2 mb-4">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-secondary">
                      <Check size={14} className="shrink-0 mt-0.5 text-[var(--successVibrant)]" />{f}
                    </li>
                  ))}
                </ul>
                {plan.id !== 'free' && (
                  <Button
                    variant={isCurrent ? 'secondary' : 'premium'}
                    className="w-full"
                    size="lg"
                    disabled={isCurrent || upgrading}
                    loading={upgrading && selectedPlan === plan.id}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {isCurrent ? 'Actuel' : plan.cta}
                  </Button>
                )}
              </motion.div>
            )
          })}
        </div>

        <p className="text-xs text-secondary uppercase tracking-wider px-1 font-semibold pt-2">Comparaison détaillée</p>
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="grid grid-cols-4 text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: 'var(--surfaceElevated)' }}>
            <div className="px-3 py-2.5 text-secondary">Fonctionnalité</div>
            <div className="px-2 py-2.5 text-center text-secondary">Gratuit</div>
            <div className="px-2 py-2.5 text-center text-secondary">Premium</div>
            <div className="px-2 py-2.5 text-center text-secondary">Annuel</div>
          </div>
          {comparisonFeatures.map((f, i) => (
            <div key={f.name} className={`grid grid-cols-4 text-xs ${i < comparisonFeatures.length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'var(--border)' }}>
              <div className="px-3 py-2.5 text-secondary truncate">{f.name}</div>
              {(['free', 'premium', 'yearly'] as const).map(col => {
                const val = f[col]
                return (
                  <div key={col} className="px-2 py-2.5 text-center">
                    {typeof val === 'string' ? (
                      <span className="text-secondary">{val}</span>
                    ) : val ? (
                      <Check size={14} className="mx-auto text-[var(--successVibrant)]" />
                    ) : (
                      <XIcon size={14} className="mx-auto text-[var(--textMuted)]/40" />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <p className="text-xs text-secondary uppercase tracking-wider px-1 font-semibold pt-2">Fonctionnalités Premium</p>
        <div className="grid grid-cols-2 gap-2">
          {premiumFeatures.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="glass-card rounded-xl p-3 space-y-1.5 hover:scale-[1.02] transition-transform"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
                <f.icon size={14} style={{ color: 'var(--primary)' }} />
              </div>
              <p className="text-xs font-semibold">{f.label}</p>
              <p className="text-[10px] text-secondary leading-tight">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center text-[10px] text-secondary pt-2 space-y-1 pb-4">
          <p>Paiement sécurisé via PayDunya</p>
          <p>Résiliable à tout moment</p>
        </div>
      </div>
    </div>
  )
}
