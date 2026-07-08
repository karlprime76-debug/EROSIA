'use client'

import { useState, useEffect, useCallback } from 'react'
import { Crown, Check, Copy, Share2, Sparkles, Star, MapPin, Eye, Brain, Gift, Loader } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { createCheckoutSession, getSubscriptionStatus } from '@/lib/api'
import { getReferralCode, getReferralStats } from '@/lib/referrals'
import { logger } from '@/lib/logger'

type Tab = 'abonnements' | 'parrainage'
type Tier = 'free' | 'premium'

interface Plan {
  id: string
  name: string
  price: string
  period: string
  priceCfa: number
  popular?: boolean
  features: string[]
  cta: string
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Gratuit',
    price: '0',
    period: '/mois',
    priceCfa: 0,
    features: [
      '20 swipes par jour',
      'Profils de base',
      'Chat avec tes matchs',
      'Stories',
    ],
    cta: 'Actuel',
  },
  {
    id: 'premium_monthly',
    name: 'Premium',
    price: '5 000',
    period: '/mois',
    priceCfa: 5000,
    popular: true,
    features: [
      'Swipes illimités',
      'Ghost Mode',
      'Mode Voyage',
      'Quiz de compatibilité',
      'Voir qui t\'a liké',
      'Badge Premium',
    ],
    cta: 'S\'abonner',
  },
  {
    id: 'premium_yearly',
    name: 'Premium Annuel',
    price: '50 000',
    period: '/an',
    priceCfa: 50000,
    features: [
      'Tous les avantages Premium',
      'Économise 10 000 F',
      'Badge Premium exclusif',
      'Priorité support',
    ],
    cta: 'S\'abonner',
  },
]

const premiumFeatures = [
  { icon: Sparkles, label: 'Swipes illimités', desc: 'Fini la limite de 20 swipes par jour' },
  { icon: Eye, label: 'Ghost Mode', desc: 'Navigue anonymement sans être vu' },
  { icon: MapPin, label: 'Mode Voyage', desc: 'Change ta localisation où tu veux' },
  { icon: Brain, label: 'Quiz compatibilité', desc: 'Trouve l\'âme sœur avec le quiz' },
  { icon: Star, label: 'Badge Premium', desc: 'Montre ton statut Premium' },
  { icon: MapPin, label: 'Voir les likes', desc: 'Sait qui t\'a liké avant de swiper' },
]

export default function BoutiquePage() {
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('abonnements')
  const [currentTier, setCurrentTier] = useState<Tier>('free')
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)

  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referralStats, setReferralStats] = useState({ total: 0, joined: 0, canRedeem: false, rewarded: false })
  const [copied, setCopied] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemMsg, setRedeemMsg] = useState('')

  useEffect(() => {
    getSubscriptionStatus().then(s => {
      setCurrentTier(s.tier)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (tab !== 'parrainage') return
    getReferralCode().then(setReferralCode)
    getReferralStats().then(setReferralStats)
  }, [tab])

  const handleUpgrade = useCallback(async () => {
    setUpgrading(true)
    const { url, error } = await createCheckoutSession()
    if (error) { toast(error, 'error'); setUpgrading(false); return }
    if (url) window.location.href = url
    setUpgrading(false)
  }, [toast])

  const copyCode = useCallback(() => {
    if (!referralCode) return
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(logger.error)
  }, [referralCode])

  const shareLink = useCallback(() => {
    if (!referralCode) return
    const url = `${window.location.origin}/register?ref=${referralCode}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(logger.error)
  }, [referralCode])

  const handleRedeem = useCallback(async () => {
    setRedeeming(true); setRedeemMsg('')
    try {
      const res = await fetch('/api/referrals/redeem', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setRedeemMsg('30 jours Premium offerts !')
        setReferralStats(prev => ({ ...prev, rewarded: true }))
        getSubscriptionStatus().then(s => setCurrentTier(s.tier))
      } else {
        setRedeemMsg(data.error ?? 'Erreur')
      }
    } catch {
      setRedeemMsg('Erreur réseau')
    } finally {
      setRedeeming(false)
    }
  }, [])

  const isPremium = currentTier === 'premium'

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <h1 className="sr-only">Boutique</h1>
      <header className="px-5 pt-6 pb-2">
        <h2 className="text-3xl font-bold" style={{ color: 'var(--textPrimary)' }}>Boutique</h2>
        <p className="text-secondary text-sm mt-0.5">Abonnements et parrainage</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-4 mt-3">
        {(['abonnements', 'parrainage'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t
                ? 'text-on-primary shadow-lg shadow-[var(--primary)]/20'
                : 'text-secondary bg-[var(--surfaceElevated)]'
            }`}
            style={tab === t ? { background: 'var(--primary)' } : undefined}
          >
            {t === 'abonnements' ? 'Abonnements' : 'Parrainage'}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 pb-8 overflow-y-auto space-y-4 mt-4">
        {tab === 'abonnements' && (
          <>
            {/* Current plan banner */}
            {isPremium && (
              <div className="glass-card rounded-2xl p-4 flex items-center gap-3 border border-[var(--successVibrant)]/20">
                <div className="w-10 h-10 rounded-full bg-[var(--successVibrant)]/15 flex items-center justify-center shrink-0">
                  <Crown size={18} className="text-[var(--successVibrant)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--textPrimary)' }}>Premium actif</p>
                  <p className="text-xs text-secondary">Tous les avantages débloqués</p>
                </div>
              </div>
            )}

            <p className="text-xs text-secondary uppercase tracking-wider px-1 font-semibold">Nos formules</p>

            {/* Pricing cards */}
            <div className="space-y-3">
              {plans.map(plan => {
                const isCurrent = plan.id === 'free' ? !isPremium : plan.id === 'premium_monthly' && isPremium
                return (
                  <div
                    key={plan.id}
                    className={`glass-card rounded-2xl p-5 relative transition-all duration-200 ${
                      plan.popular ? 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--bg)]' : ''
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg"
                        style={{ background: 'linear-gradient(135deg, var(--primary), #FF6B35)', color: 'white' }}>
                        Plus populaire
                      </span>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--textPrimary)' }}>{plan.name}</h3>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-3xl font-black" style={{ color: 'var(--textPrimary)' }}>{plan.price} F</span>
                          <span className="text-xs text-secondary">{plan.period}</span>
                        </div>
                      </div>
                      {plan.id === 'premium_yearly' && (
                        <span className="px-2 py-1 rounded-lg text-[10px] font-bold"
                          style={{ background: 'var(--successVibrant)/15', color: 'var(--successVibrant)' }}>
                          -17%
                        </span>
                      )}
                    </div>
                    <ul className="space-y-2 mb-4">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm" style={{ color: 'var(--textSecondary)' }}>
                          <Check size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--successVibrant)' }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {plan.id !== 'free' && (
                      <button
                        type="button"
                        onClick={handleUpgrade}
                        disabled={isCurrent || upgrading}
                        className={`w-full py-3 rounded-full text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-40 ${
                          isCurrent
                            ? 'border border-[var(--border)] text-secondary cursor-default'
                            : 'text-on-primary shadow-lg'
                        }`}
                        style={isCurrent ? undefined : { background: 'linear-gradient(135deg, var(--primary), #FF6B35)' }}
                      >
                        {upgrading ? (
                          <span className="flex items-center justify-center gap-2"><Loader size={16} className="animate-spin" /> En cours...</span>
                        ) : isCurrent ? (
                          'Actuel'
                        ) : (
                          plan.cta
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Premium features grid */}
            <p className="text-xs text-secondary uppercase tracking-wider px-1 font-semibold pt-2">Fonctionnalités Premium</p>
            <div className="grid grid-cols-2 gap-2">
              {premiumFeatures.map(f => (
                <div key={f.label} className="glass-card rounded-xl p-3 space-y-1.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)/10' }}>
                    <f.icon size={14} style={{ color: 'var(--primary)' }} />
                  </div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--textPrimary)' }}>{f.label}</p>
                  <p className="text-[10px] text-secondary leading-tight">{f.desc}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'parrainage' && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-5 text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accentOrange)]/60 flex items-center justify-center mx-auto mb-3">
                <Gift size={22} className="text-on-primary" />
              </div>
              <h3 className="text-lg font-bold" style={{ color: 'var(--textPrimary)' }}>Parraine tes amis</h3>
              <p className="text-sm text-secondary mt-1">Invite tes amis à rejoindre Erosia et gagne <strong className="text-primary">30 jours Premium</strong> pour chaque tranche de <strong>5 filleuls</strong>.</p>
            </div>

            {/* Referral code */}
            <div className="glass-card rounded-2xl p-5">
              <p className="text-xs text-secondary uppercase tracking-wider font-semibold mb-3">Ton code de parrainage</p>
              {referralCode ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-4 py-3 rounded-xl text-base font-mono font-bold tracking-[0.3em] text-center"
                    style={{ background: 'var(--surfaceElevated)', border: '1px solid var(--border)', color: 'var(--primary)' }}>
                    {referralCode}
                  </code>
                  <button type="button" onClick={copyCode} aria-label="Copier le code"
                    className="p-3 rounded-xl transition active:scale-90" style={{ background: 'var(--surfaceElevated)' }}>
                    {copied ? <Check size={16} className="text-[var(--successVibrant)]" /> : <Copy size={16} style={{ color: 'var(--textSecondary)' }} />}
                  </button>
                  <button type="button" onClick={shareLink} aria-label="Copier le lien de parrainage"
                    className="p-3 rounded-xl transition active:scale-90" style={{ background: 'var(--surfaceElevated)' }}>
                    <Share2 size={16} style={{ color: 'var(--textSecondary)' }} />
                  </button>
                </div>
              ) : (
                <div className="animate-pulse h-12 rounded-xl" style={{ background: 'var(--surfaceElevated)' }} />
              )}
            </div>

            {/* Progress */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-secondary uppercase tracking-wider font-semibold">Tes filleuls</p>
                <span className="text-xs font-medium" style={{ color: 'var(--textSecondary)' }}>
                  <strong className="text-primary">{referralStats.joined}</strong> inscrits sur <strong>5</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`flex-1 h-2.5 rounded-full transition-all duration-500 ${
                    i <= referralStats.joined
                      ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--accentOrange)]'
                      : ''
                  }`} style={i > referralStats.joined ? { background: 'var(--surfaceElevated)' } : undefined} />
                ))}
              </div>
              {referralStats.rewarded ? (
                <p className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--successVibrant)' }}>
                  <Check size={16} /> Récompense déjà obtenue
                </p>
              ) : referralStats.canRedeem ? (
                <button type="button" onClick={handleRedeem} disabled={redeeming}
                  className="w-full py-3 rounded-full text-sm font-semibold text-on-primary transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, var(--primary), var(--accentOrange))' }}>
                  {redeeming ? 'Récompense en cours...' : '🎉 Réclamer 30 jours Premium'}
                </button>
              ) : (
                <p className="text-sm text-secondary">
                  {referralStats.joined > 0
                    ? `Plus que ${5 - referralStats.joined} filleul${5 - referralStats.joined > 1 ? 's' : ''} pour débloquer 30 jours Premium`
                    : 'Partage ton code avec tes amis pour commencer'}
                </p>
              )}
              {redeemMsg && <p className="text-sm text-secondary mt-2">{redeemMsg}</p>}
            </div>

            {/* How it works */}
            <div className="glass-card rounded-2xl p-5">
              <p className="text-xs text-secondary uppercase tracking-wider font-semibold mb-3">Comment ça marche</p>
              <div className="space-y-3">
                {[
                  { step: '1', text: 'Partage ton code de parrainage avec tes amis' },
                  { step: '2', text: 'Ils s\'inscrivent avec ton code' },
                  { step: '3', text: 'Quand 5 amis ont rejoint, tu débloques 30 jours Premium' },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: 'var(--primary)/15', color: 'var(--primary)' }}>
                      {s.step}
                    </div>
                    <p className="text-sm" style={{ color: 'var(--textSecondary)' }}>{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
