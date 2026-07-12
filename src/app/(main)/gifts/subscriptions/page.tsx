'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Crown, Check, Loader, Sparkles, Eye, MapPin, Brain, Star } from 'lucide-react'
import { createCheckoutSession, getSubscriptionStatus } from '@/lib/api'
import { useToast } from '@/components/Toast'

type Tier = 'free' | 'premium'

interface Plan {
  id: string; name: string; price: string; period: string; priceCfa: number; popular?: boolean; features: string[]; cta: string
}

const plans: Plan[] = [
  { id: 'free', name: 'Gratuit', price: '0', period: '/mois', priceCfa: 0, features: ['20 swipes par jour', 'Profils de base', 'Chat avec tes matchs', 'Stories'], cta: 'Actuel' },
  { id: 'premium_monthly', name: 'Premium', price: '5 000', period: '/mois', priceCfa: 5000, popular: true, features: ['Swipes illimités', 'Ghost Mode', 'Mode Voyage', 'Quiz de compatibilité', 'Voir qui t\'a liké', 'Badge Premium'], cta: 'S\'abonner' },
  { id: 'premium_yearly', name: 'Premium Annuel', price: '50 000', period: '/an', priceCfa: 50000, features: ['Tous les avantages Premium', 'Économise 10 000 F', 'Badge Premium exclusif', 'Priorité support'], cta: 'S\'abonner' },
]

const premiumFeatures = [
  { icon: Sparkles, label: 'Swipes illimités', desc: 'Fini la limite de 20 swipes par jour' },
  { icon: Eye, label: 'Ghost Mode', desc: 'Navigue anonymement sans être vu' },
  { icon: MapPin, label: 'Mode Voyage', desc: 'Change ta localisation où tu veux' },
  { icon: Brain, label: 'Quiz compatibilité', desc: 'Trouve l\'âme sœur avec le quiz' },
  { icon: Star, label: 'Badge Premium', desc: 'Montre ton statut Premium' },
  { icon: Eye, label: 'Voir les likes', desc: 'Sait qui t\'a liké avant de swiper' },
]

export default function SubscriptionsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentTier, setCurrentTier] = useState<Tier>('free')
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const isPremium = currentTier === 'premium'

  useEffect(() => {
    getSubscriptionStatus().then(s => { setCurrentTier(s.tier); setLoading(false) })
  }, [])

  const handleUpgrade = useCallback(async (planId: string) => {
    setUpgrading(true)
    const plan = planId === 'premium_yearly' ? 'yearly' : 'monthly'
    const { url, error } = await createCheckoutSession(plan)
    if (error) { toast(error, 'error'); setUpgrading(false); return }
    if (url) window.location.href = url
    setUpgrading(false)
  }, [toast])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.push('/gifts')} aria-label="Retour" className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Abonnements</h2>
      </header>
      <div className="flex-1 px-4 pb-8 overflow-y-auto space-y-4">
        {isPremium && (
          <div className="glass-card rounded-2xl p-4 flex items-center gap-3 border border-[var(--successVibrant)]/20">
            <div className="w-10 h-10 rounded-full bg-[var(--successVibrant)]/15 flex items-center justify-center shrink-0">
              <Crown size={18} className="text-[var(--successVibrant)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Premium actif</p>
              <p className="text-xs text-secondary">Tous les avantages débloqués</p>
            </div>
          </div>
        )}
        <p className="text-xs text-secondary uppercase tracking-wider px-1 font-semibold">Nos formules</p>
        <div className="space-y-3">
          {plans.map(plan => {
            const isCurrent = plan.id === 'free' ? !isPremium : isPremium && (plan.id === 'premium_monthly' || plan.id === 'premium_yearly')
            return (
              <div key={plan.id} className={`glass-card rounded-2xl p-5 relative transition-all duration-200 ${plan.popular ? 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--bg)]' : ''}`}>
                {plan.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg"
                    style={{ background: 'linear-gradient(135deg, var(--primary), #FF6B35)', color: 'white' }}>Plus populaire</span>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-black">{plan.price} F</span>
                      <span className="text-xs text-secondary">{plan.period}</span>
                    </div>
                  </div>
                  {plan.id === 'premium_yearly' && (
                    <span className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: 'color-mix(in srgb, var(--successVibrant) 15%, transparent)', color: 'var(--successVibrant)' }}>-17%</span>
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
                  <button type="button" onClick={() => handleUpgrade(plan.id)} disabled={isCurrent || upgrading}
                    className={`w-full py-3 rounded-full text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40 ${isCurrent ? 'border border-[var(--border)] text-secondary cursor-default' : 'text-on-primary shadow-lg'}`}
                    style={isCurrent ? undefined : { background: 'linear-gradient(135deg, var(--primary), #FF6B35)' }}>
                    {upgrading ? <span className="flex items-center justify-center gap-2"><Loader size={16} className="animate-spin" /> En cours...</span> : isCurrent ? 'Actuel' : plan.cta}
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-xs text-secondary uppercase tracking-wider px-1 font-semibold pt-2">Fonctionnalités Premium</p>
        <div className="grid grid-cols-2 gap-2">
          {premiumFeatures.map(f => (
            <div key={f.label} className="glass-card rounded-xl p-3 space-y-1.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
                <f.icon size={14} style={{ color: 'var(--primary)' }} />
              </div>
              <p className="text-xs font-semibold">{f.label}</p>
              <p className="text-[10px] text-secondary leading-tight">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
