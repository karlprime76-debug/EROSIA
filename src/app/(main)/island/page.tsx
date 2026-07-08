'use client'

import { useState, useEffect, useCallback } from 'react'
import { Crown, Check, Copy, Share2, Sparkles, Star, MapPin, Eye, Brain, Gift, Loader, Send, Smartphone, CreditCard, ChevronRight, Wallet, ArrowUpRight, History, CheckCircle, Clock, ShoppingCart, X } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { createCheckoutSession, getSubscriptionStatus, getGifts, getMatches, createCartCheckout, getReceivedGifts, getPaymentAccount, savePaymentAccount, getCountries, getGiftBalance, getGiftTransactions, requestPayout } from '@/lib/api'
import type { GiftTransaction } from '@/lib/api'
import { getReferralCode, getReferralStats } from '@/lib/referrals'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase/client'
import { FocusTrap } from '@/components/FocusTrap'

type Tab = 'abonnements' | 'cadeaux' | 'parrainage'
type Tier = 'free' | 'premium'

interface GiftItem { id: string; name: string; emoji: string; price_cents: number }
interface MatchItem { id: string; user1_id: string; user2_id: string }

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
    features: ['20 swipes par jour', 'Profils de base', 'Chat avec tes matchs', 'Stories'],
    cta: 'Actuel',
  },
  {
    id: 'premium_monthly',
    name: 'Premium',
    price: '5 000',
    period: '/mois',
    priceCfa: 5000,
    popular: true,
    features: ['Swipes illimités', 'Ghost Mode', 'Mode Voyage', 'Quiz de compatibilité', 'Voir qui t\'a liké', 'Badge Premium'],
    cta: 'S\'abonner',
  },
  {
    id: 'premium_yearly',
    name: 'Premium Annuel',
    price: '50 000',
    period: '/an',
    priceCfa: 50000,
    features: ['Tous les avantages Premium', 'Économise 10 000 F', 'Badge Premium exclusif', 'Priorité support'],
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

const EUR_TO_XOF = 655.957
const toXof = (cents: number) => Math.round(cents * EUR_TO_XOF / 100)
const fmt = (n: number) => n.toLocaleString('fr-FR')
const countries = getCountries()

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

  // Gifts state
  const [gifts, setGifts] = useState<GiftItem[]>([])
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [myId, setMyId] = useState('')
  const [cart, setCart] = useState<GiftItem[]>([])
  const [showCheckout, setShowCheckout] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState('')
  const [giftMessage, setGiftMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [received, setReceived] = useState<Array<{ id: string; gift: GiftItem; sender: { name: string; photos: string[] }; created_at: string }>>([])
  const [showPaymentConfig, setShowPaymentConfig] = useState(false)
  const [payMethod, setPayMethod] = useState<'mobile_money' | 'card'>('mobile_money')
  const [payCountry, setPayCountry] = useState('SN')
  const [payOperator, setPayOperator] = useState('Orange Money')
  const [payPhone, setPayPhone] = useState('')
  const [paySaved, setPaySaved] = useState(false)
  const [payCardLast4, setPayCardLast4] = useState('')
  const [payCardBrand, setPayCardBrand] = useState('')
  const [savedPayMethod, setSavedPayMethod] = useState<'mobile_money' | 'card' | null>(null)
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<GiftTransaction[]>([])
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutProcessing, setPayoutProcessing] = useState(false)
  const [matchNames, setMatchNames] = useState<Record<string, string>>({})
  const [giftsLoading, setGiftsLoading] = useState(true)

  const countryOps = countries.find(c => c.code === payCountry)?.operators ?? []

  const toggleCart = useCallback((gift: GiftItem) => {
    setCart(prev => prev.find(g => g.id === gift.id) ? prev.filter(g => g.id !== gift.id) : [...prev, gift])
  }, [])

  const cartTotal = cart.reduce((sum, g) => sum + toXof(g.price_cents), 0)

  useEffect(() => {
    getSubscriptionStatus().then(s => { setCurrentTier(s.tier); setLoading(false) })
  }, [])

  useEffect(() => {
    if (tab !== 'parrainage') return
    getReferralCode().then(setReferralCode)
    getReferralStats().then(setReferralStats)
  }, [tab])

  useEffect(() => {
    if (tab !== 'cadeaux' || gifts.length > 0) return
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setMyId(data.user.id)
      const uid = data.user.id
      const [giftsData, receivedData, payAcc] = await Promise.all([getGifts(), getReceivedGifts(), getPaymentAccount()])
      if (giftsData.data) setGifts(giftsData.data)
      if (receivedData.data) setReceived(receivedData.data as typeof received)
      if (payAcc) {
        setSavedPayMethod(payAcc.type as 'mobile_money' | 'card')
        if (payAcc.type === 'mobile_money') { setPayPhone(payAcc.phone ?? ''); setPayOperator(payAcc.operator ?? 'Orange Money'); setPayCountry(payAcc.country ?? 'SN'); setPaySaved(true) }
        else if (payAcc.type === 'card') { setPayCardLast4(payAcc.card_last4 ?? ''); setPayCardBrand(payAcc.card_brand ?? ''); setPaySaved(true) }
      }
      const [matchData, bal, txns] = await Promise.all([getMatches(), getGiftBalance(), getGiftTransactions()])
      if (matchData.data) {
        setMatches(matchData.data)
        const otherIds = matchData.data.map(m => m.user1_id === uid ? m.user2_id : m.user1_id).filter(Boolean)
        if (otherIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', otherIds)
          if (profiles) { const names: Record<string, string> = {}; for (const p of profiles) names[p.id] = p.name; setMatchNames(names) }
        }
      }
      setBalance(bal)
      if (txns.data) setTransactions(txns.data)
      setGiftsLoading(false)
    }).catch(() => { toast('Erreur chargement des cadeaux', 'error'); setGiftsLoading(false) })
  }, [tab, toast])

  const handleUpgrade = useCallback(async () => {
    setUpgrading(true)
    const { url, error } = await createCheckoutSession()
    if (error) { toast(error, 'error'); setUpgrading(false); return }
    if (url) window.location.href = url
    setUpgrading(false)
  }, [toast])

  const copyCode = useCallback(() => {
    if (!referralCode) return
    navigator.clipboard.writeText(referralCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(logger.error)
  }, [referralCode])

  const shareLink = useCallback(() => {
    if (!referralCode) return
    const url = `${window.location.origin}/register?ref=${referralCode}`
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(logger.error)
  }, [referralCode])

  const handleRedeem = useCallback(async () => {
    setRedeeming(true); setRedeemMsg('')
    try {
      const res = await fetch('/api/referrals/redeem', { method: 'POST' })
      const data = await res.json()
      if (res.ok) { setRedeemMsg('30 jours Premium offerts !'); setReferralStats(prev => ({ ...prev, rewarded: true })); getSubscriptionStatus().then(s => setCurrentTier(s.tier)) }
      else setRedeemMsg(data.error ?? 'Erreur')
    } catch { setRedeemMsg('Erreur réseau') }
    finally { setRedeeming(false) }
  }, [])

  const getOtherId = (m: MatchItem) => m.user1_id === myId ? m.user2_id : m.user1_id

  const handleCheckout = async () => {
    if (!selectedMatch || cart.length === 0) return
    setSending(true)
    try {
      const match = matches.find(m => m.id === selectedMatch)
      if (!match) return
      const result = await createCartCheckout(cart.map(g => g.id), getOtherId(match), selectedMatch, giftMessage || undefined, payPhone || undefined, payOperator || undefined)
      if (result.error) { toast(result.error, 'error'); setSending(false); return }
      if (result.data?.sent) {
        toast('Demande de paiement envoyée sur votre téléphone.', 'success')
        setCart([]); setShowCheckout(false)
        return
      }
      if (result.data?.url) { window.location.href = result.data.url; return }
    } catch {
      toast('Erreur lors de l\'envoi', 'error')
    } finally { setSending(false) }
  }

  const handlePayout = async () => {
    const amount = parseInt(payoutAmount)
    if (!amount || amount <= 0 || amount > balance) return
    setPayoutProcessing(true)
    try {
      const { error, message } = await requestPayout(amount)
      if (error) { toast(error, 'error'); return }
      toast(message ?? `Retrait de ${fmt(amount)} F effectué !`, 'success')
      setShowPayoutModal(false); setPayoutAmount('')
      setBalance(await getGiftBalance())
      const t = await getGiftTransactions(); if (t.data) setTransactions(t.data)
    } catch { toast('Erreur lors du retrait', 'error') }
    finally { setPayoutProcessing(false) }
  }

  const handleSavePayment = async () => {
    if (payMethod === 'mobile_money') {
      if (!payPhone || payPhone.length < 8) return
      const { error } = await savePaymentAccount({ type: 'mobile_money', phone: payPhone, operator: payOperator, country: payCountry })
      if (error) { toast(error, 'error'); return }
    } else {
      if (!payCardLast4 || payCardLast4.length < 4) { toast('Les 4 derniers chiffres de la carte sont requis.', 'error'); return }
      const { error } = await savePaymentAccount({ type: 'card', card_last4: payCardLast4, card_brand: payCardBrand })
      if (error) { toast(error, 'error'); return }
    }
    setPaySaved(true); setShowPaymentConfig(false)
  }

  const isPremium = currentTier === 'premium'
  const allTabs: Tab[] = ['abonnements', 'cadeaux', 'parrainage']
  const tabLabels: Record<Tab, string> = { abonnements: 'Abonnements', cadeaux: 'Cadeaux', parrainage: 'Parrainage' }

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
        <p className="text-secondary text-sm mt-0.5">Abonnements, cadeaux et parrainage</p>
      </header>

      <div className="flex gap-1 px-4 mt-3">
        {allTabs.map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === t ? 'text-on-primary shadow-lg shadow-[var(--primary)]/20' : 'text-secondary bg-[var(--surfaceElevated)]'}`}
            style={tab === t ? { background: 'var(--primary)' } : undefined}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      <div className={`flex-1 px-4 overflow-y-auto space-y-4 mt-4 ${tab === 'cadeaux' && cart.length > 0 ? 'pb-24' : 'pb-8'}`}>
        {tab === 'abonnements' && (
          <>
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
            <div className="space-y-3">
              {plans.map(plan => {
                const isCurrent = plan.id === 'free' ? !isPremium : plan.id === 'premium_monthly' && isPremium
                return (
                  <div key={plan.id} className={`glass-card rounded-2xl p-5 relative transition-all duration-200 ${plan.popular ? 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--bg)]' : ''}`}>
                    {plan.popular && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg"
                        style={{ background: 'linear-gradient(135deg, var(--primary), #FF6B35)', color: 'white' }}>Plus populaire</span>
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
                        <span className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: 'var(--successVibrant)/15', color: 'var(--successVibrant)' }}>-17%</span>
                      )}
                    </div>
                    <ul className="space-y-2 mb-4">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm" style={{ color: 'var(--textSecondary)' }}>
                          <Check size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--successVibrant)' }} />{f}
                        </li>
                      ))}
                    </ul>
                    {plan.id !== 'free' && (
                      <button type="button" onClick={handleUpgrade} disabled={isCurrent || upgrading}
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

        {tab === 'cadeaux' && (
          giftsLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
            </div>
          ) : (
            <>
              <div className="glass-card rounded-2xl p-4 flex items-center gap-4 border border-[var(--warningVibrant)]/10">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--warningVibrant)] to-[var(--primary)] flex items-center justify-center shrink-0">
                  <Wallet size={20} className="text-[var(--textOnPrimary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-secondary uppercase tracking-wider">Mon portefeuille</p>
                  <p className="text-2xl font-bold text-[var(--textPrimary)]">{fmt(balance)} F</p>
                </div>
                <button type="button" onClick={() => { if (balance <= 0) return; if (!paySaved) { setShowPaymentConfig(true); return } setShowPayoutModal(true) }}
                  disabled={balance <= 0} className="px-4 py-2 rounded-full text-xs font-semibold text-[var(--textOnPrimary)] disabled:opacity-30 flex items-center gap-1.5 transition-all active:scale-95" style={{ background: 'var(--primary)' }}>
                  <ArrowUpRight size={14} /> Retirer
                </button>
              </div>

              {showPayoutModal && (
                <div aria-hidden="true" role="presentation" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={() => setShowPayoutModal(false)}
                  onKeyDown={(e) => { if (e.key === 'Escape') setShowPayoutModal(false) }}>
                  <FocusTrap active={showPayoutModal}><div role="dialog" aria-modal="true" tabIndex={-1} className="w-full max-w-sm bg-[var(--card)] rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-bold text-[var(--textPrimary)] mb-1">Retirer ton solde</h3>
                    <p className="text-xs text-secondary mb-4">Solde disponible : <strong className="text-[var(--textPrimary)]">{fmt(balance)} F</strong></p>
                    <div className="mb-3">
                      <label className="text-xs text-secondary mb-1 block">Montant (F)</label>
                      <input type="number" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} placeholder="5000" max={balance} aria-label="Montant du retrait"
                        className="w-full px-4 py-3 rounded-xl bg-[var(--surfaceElevated)] text-[var(--textPrimary)] text-sm border border-[var(--border)] outline-none focus:border-[var(--primary)]" />
                    </div>
                    <div className="mb-4">
                      <label className="text-xs text-secondary mb-1 block">Moyen de retrait</label>
                      <div className="px-4 py-3 rounded-xl bg-[var(--surfaceElevated)] text-[var(--textPrimary)] text-sm flex items-center gap-2">
                        {savedPayMethod === 'card' ? <CreditCard size={16} /> : <Smartphone size={16} />}
                        <span className="text-secondary">{savedPayMethod === 'card' ? `${payCardBrand} ···· ${payCardLast4}` : `${payOperator} — ${payPhone}`}</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setShowPayoutModal(false)} className="flex-1 py-3 rounded-full text-sm font-medium border border-[var(--border)] text-secondary">Annuler</button>
                      <button type="button" onClick={handlePayout} disabled={!payoutAmount || parseInt(payoutAmount) <= 0 || parseInt(payoutAmount) > balance || payoutProcessing}
                        className="flex-1 py-3 rounded-full text-sm font-semibold text-[var(--textOnPrimary)] disabled:opacity-40 flex items-center justify-center gap-2" style={{ background: 'var(--primary)' }}>
                        {payoutProcessing ? 'En cours...' : `Retirer ${fmt(parseInt(payoutAmount) || 0)} F`}
                      </button>
                    </div>
                  </div></FocusTrap>
                </div>
              )}

              <button type="button" onClick={() => setShowPaymentConfig(!showPaymentConfig)}
                className="w-full glass-card rounded-xl px-4 py-3 flex items-center gap-3 text-left">
                {savedPayMethod === 'card' ? <CreditCard size={20} className="text-secondary" /> : <Smartphone size={20} className="text-secondary" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Moyen de paiement</p>
                  <p className="text-xs text-secondary">{paySaved ? (savedPayMethod === 'card' ? `${payCardBrand} ···· ${payCardLast4}` : `${payOperator} — ${payPhone}`) : 'Ajouter un moyen de paiement'}</p>
                </div>
                <ChevronRight size={16} className="text-muted" />
              </button>

              {showPaymentConfig && (
                <div className="glass-card rounded-xl p-4 space-y-3 animate-scale-in">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setPayMethod('mobile_money'); setPaySaved(false) }}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition ${payMethod === 'mobile_money' ? 'bg-primary text-on-primary' : 'bg-[var(--surfaceElevated)] text-secondary'}`}>
                      <Smartphone size={16} className="mx-auto mb-1" /> Mobile Money
                    </button>
                    <button type="button" onClick={() => { setPayMethod('card'); setPaySaved(false) }}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition ${payMethod === 'card' ? 'bg-primary text-on-primary' : 'bg-[var(--surfaceElevated)] text-secondary'}`}>
                      <CreditCard size={16} className="mx-auto mb-1" /> Carte bancaire
                    </button>
                  </div>
                  {payMethod === 'mobile_money' ? (
                    <>
                      <div>
                        <label className="text-xs text-secondary mb-1 block">Pays</label>
                        <select value={payCountry} onChange={e => { setPayCountry(e.target.value); setPayOperator(countries.find(c => c.code === e.target.value)?.operators[0] ?? '') }}
                          className="w-full px-3 py-2.5 rounded-lg bg-[var(--card)] text-[var(--textPrimary)] text-sm border border-[var(--border)] outline-none">
                          {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-secondary mb-1 block">Opérateur</label>
                        <select value={payOperator} onChange={e => setPayOperator(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg bg-[var(--card)] text-[var(--textPrimary)] text-sm border border-[var(--border)] outline-none">
                          {countryOps.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-secondary mb-1 block">Numéro de téléphone</label>
                        <input value={payPhone} onChange={e => setPayPhone(e.target.value)} placeholder="+221 77 123 45 67" aria-label="Numéro de téléphone"
                          className="w-full px-3 py-2.5 rounded-lg bg-[var(--card)] text-[var(--textPrimary)] text-sm border border-[var(--border)] outline-none focus:border-[var(--primary)]" />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-secondary text-center">Carte bancaire — les paiements sont sécurisés via PayDunya.</p>
                      <div>
                        <label className="text-xs text-secondary mb-1 block">4 derniers chiffres</label>
                        <input value={payCardLast4} onChange={e => setPayCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" maxLength={4} inputMode="numeric" aria-label="4 derniers chiffres de la carte"
                          className="w-full px-3 py-2.5 rounded-lg bg-[var(--card)] text-[var(--textPrimary)] text-sm border border-[var(--border)] outline-none focus:border-[var(--primary)]" />
                      </div>
                      <div>
                        <label className="text-xs text-secondary mb-1 block">Marque</label>
                        <select value={payCardBrand} onChange={e => setPayCardBrand(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg bg-[var(--card)] text-[var(--textPrimary)] text-sm border border-[var(--border)] outline-none">
                          <option value="Visa">Visa</option>
                          <option value="Mastercard">Mastercard</option>
                          <option value="Orange Money">Orange Money</option>
                          <option value="Wave">Wave</option>
                          <option value="Autre">Autre</option>
                        </select>
                      </div>
                    </div>
                  )}
                  <button type="button" onClick={handleSavePayment}
                    className="w-full py-2.5 rounded-full text-[var(--textOnPrimary)] text-sm font-semibold" style={{ background: 'var(--primary)' }}>
                    {paySaved ? 'Modifier' : 'Enregistrer'}
                  </button>
                </div>
              )}

              {gifts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-up">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 to-transparent mx-auto mb-4 flex items-center justify-center border border-[var(--primary)]/10">
                    <span className="text-2xl opacity-40">🎁</span>
                  </div>
                  <p className="text-sm text-secondary">Aucun cadeau disponible pour le moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {gifts.map(g => {
                    const inCart = cart.some(c => c.id === g.id)
                    return (
                      <button type="button" key={g.id} onClick={() => toggleCart(g)}
                        className={`relative bg-[var(--card)] rounded-xl border p-3 text-center transition-all duration-200 hover:scale-[1.03] active:scale-95 ${inCart ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]' : 'border-[var(--border)]'}`}>
                        {inCart && (
                          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center">
                            <Check size={12} />
                          </span>
                        )}
                        <span className="text-3xl block mb-1">{g.emoji || '🎁'}</span>
                        <p className="text-[10px] font-medium truncate">{g.name}</p>
                        <p className="text-[10px] text-primary font-bold">{fmt(toXof(g.price_cents))} F</p>
                      </button>
                    )
                  })}
                </div>
              )}

              {transactions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-2 px-1 flex items-center gap-2">
                    <History size={14} /> Historique des transactions
                  </h3>
                  <div className="space-y-2">
                    {transactions.slice(0, 10).map(t => {
                      const isCredit = t.type === 'gift_received'
                      const isPendingPayout = t.type === 'payout' && t.status === 'pending'
                      return (
                        <div key={t.id} className="glass-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:scale-[1.01]">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isCredit ? 'bg-[var(--successVibrant)]/15' : isPendingPayout ? 'bg-[var(--warningVibrant)]/15' : 'bg-[var(--primary)]/15'}`}>
                            {isCredit ? <ArrowUpRight size={16} className="text-[var(--successVibrant)]" /> : isPendingPayout ? <Clock size={16} className="text-[var(--warningVibrant)]" /> : <CheckCircle size={16} className="text-[var(--primary)]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{isCredit ? 'Cadeau reçu' : 'Retrait demandé'}</p>
                            <p className="text-[10px] text-secondary">{new Date(t.created_at).toLocaleDateString('fr-FR')}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${isCredit ? 'text-[var(--successVibrant)]' : 'text-[var(--primary)]'}`}>{isCredit ? '+' : '-'}{fmt(t.amount_cents)} F</p>
                            <p className={`text-[10px] ${t.status === 'completed' ? 'text-[var(--successVibrant)]' : t.status === 'pending' ? 'text-[var(--warningVibrant)]' : 'text-secondary'}`}>
                              {t.status === 'completed' ? 'Effectué' : t.status === 'pending' ? 'En attente' : t.status}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {received.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-2 px-1">Cadeaux reçus</h3>
                  <div className="space-y-2">
                    {received.slice(0, 5).map(r => (
                      <div key={r.id} className="glass-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:scale-[1.01]">
                        <span className="text-2xl">{r.gift?.emoji || '🎁'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{r.gift?.name || 'Cadeau'}</p>
                          <p className="text-xs text-secondary">De {r.sender?.name || 'Inconnu'}</p>
                        </div>
                        {r.gift?.price_cents && (
                          <div className="text-right">
                            <p className="text-xs font-bold text-[var(--warningVibrant)]">+{fmt(toXof(r.gift.price_cents - Math.round(r.gift.price_cents * 0.15)))} F</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )
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
            <div className="glass-card rounded-2xl p-5">
              <p className="text-xs text-secondary uppercase tracking-wider font-semibold mb-3">Ton code de parrainage</p>
              {referralCode ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-4 py-3 rounded-xl text-base font-mono font-bold tracking-[0.3em] text-center"
                    style={{ background: 'var(--surfaceElevated)', border: '1px solid var(--border)', color: 'var(--primary)' }}>{referralCode}</code>
                  <button type="button" onClick={copyCode} aria-label="Copier le code" className="p-3 rounded-xl transition active:scale-90" style={{ background: 'var(--surfaceElevated)' }}>
                    {copied ? <Check size={16} className="text-[var(--successVibrant)]" /> : <Copy size={16} style={{ color: 'var(--textSecondary)' }} />}
                  </button>
                  <button type="button" onClick={shareLink} aria-label="Copier le lien de parrainage" className="p-3 rounded-xl transition active:scale-90" style={{ background: 'var(--surfaceElevated)' }}>
                    <Share2 size={16} style={{ color: 'var(--textSecondary)' }} />
                  </button>
                </div>
              ) : <div className="animate-pulse h-12 rounded-xl" style={{ background: 'var(--surfaceElevated)' }} />}
            </div>
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-secondary uppercase tracking-wider font-semibold">Tes filleuls</p>
                <span className="text-xs font-medium text-secondary"><strong className="text-primary">{referralStats.joined}</strong> inscrits sur <strong>5</strong></span>
              </div>
              <div className="flex items-center gap-1.5 mb-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`flex-1 h-2.5 rounded-full transition-all duration-500 ${i <= referralStats.joined ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--accentOrange)]' : ''}`}
                    style={i > referralStats.joined ? { background: 'var(--surfaceElevated)' } : undefined} />
                ))}
              </div>
              {referralStats.rewarded ? (
                <p className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--successVibrant)' }}><Check size={16} /> Récompense déjà obtenue</p>
              ) : referralStats.canRedeem ? (
                <button type="button" onClick={handleRedeem} disabled={redeeming}
                  className="w-full py-3 rounded-full text-sm font-semibold text-on-primary transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, var(--primary), var(--accentOrange))' }}>
                  {redeeming ? 'Récompense en cours...' : '🎉 Réclamer 30 jours Premium'}
                </button>
              ) : (
                <p className="text-sm text-secondary">{referralStats.joined > 0 ? `Plus que ${5 - referralStats.joined} filleul${5 - referralStats.joined > 1 ? 's' : ''} pour débloquer 30 jours Premium` : 'Partage ton code avec tes amis pour commencer'}</p>
              )}
              {redeemMsg && <p className="text-sm text-secondary mt-2">{redeemMsg}</p>}
            </div>
            <div className="glass-card rounded-2xl p-5">
              <p className="text-xs text-secondary uppercase tracking-wider font-semibold mb-3">Comment ça marche</p>
              <div className="space-y-3">
                {[
                  { step: '1', text: 'Partage ton code de parrainage avec tes amis' },
                  { step: '2', text: 'Ils s\'inscrivent avec ton code' },
                  { step: '3', text: 'Quand 5 amis ont rejoint, tu débloques 30 jours Premium' },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'var(--primary)/15', color: 'var(--primary)' }}>{s.step}</div>
                    <p className="text-sm" style={{ color: 'var(--textSecondary)' }}>{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating cart bar */}
      {tab === 'cadeaux' && cart.length > 0 && !showCheckout && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
          <div className="glass-card rounded-xl px-4 py-3 flex items-center gap-3 shadow-2xl">
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <ShoppingCart size={16} style={{ color: 'var(--primary)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--textPrimary)' }}>{cart.length} cadeau{cart.length > 1 ? 'x' : ''}</p>
              <p className="text-xs font-bold" style={{ color: 'var(--primary)' }}>{fmt(cartTotal)} F</p>
            </div>
            <button type="button" onClick={() => { setShowCheckout(true); setSelectedMatch(''); setGiftMessage('') }}
              className="px-5 py-2.5 rounded-full text-sm font-semibold text-on-primary transition-all active:scale-95 shadow-lg"
              style={{ background: 'linear-gradient(135deg, var(--primary), #FF6B35)' }}>
              Commander
            </button>
          </div>
        </div>
      )}

      {/* Checkout bottom sheet */}
      {showCheckout && (
        <div aria-hidden="true" role="presentation" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={() => setShowCheckout(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowCheckout(false) }}>
          <FocusTrap active={showCheckout}><div role="dialog" aria-modal="true" tabIndex={-1} className="w-full max-w-sm bg-[var(--card)] rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--textPrimary)' }}>Commander</h3>
              <button type="button" onClick={() => setShowCheckout(false)} aria-label="Fermer" className="p-1.5 rounded-full hover:bg-[var(--surfaceElevated)] transition">
                <X size={20} style={{ color: 'var(--textSecondary)' }} />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {cart.map(g => (
                <div key={g.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--surfaceElevated)]">
                  <span className="text-xl">{g.emoji || '🎁'}</span>
                  <span className="flex-1 text-sm font-medium" style={{ color: 'var(--textPrimary)' }}>{g.name}</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{fmt(toXof(g.price_cents))} F</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 pt-2 border-t border-[var(--border)]">
                <span className="text-sm font-semibold" style={{ color: 'var(--textPrimary)' }}>Total</span>
                <span className="text-base font-black" style={{ color: 'var(--primary)' }}>{fmt(cartTotal)} F</span>
              </div>
            </div>

            <div className="mb-3">
              <label className="text-xs text-secondary mb-1 block">Destinataire</label>
              <select value={selectedMatch} onChange={e => setSelectedMatch(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--surfaceElevated)] border border-[var(--border)] text-[var(--textPrimary)] text-sm outline-none">
                <option value="">Sélectionner un match...</option>
                {matches.map(m => (
                  <option key={m.id} value={m.id}>{matchNames[getOtherId(m)] ?? `Match #${m.id.slice(0, 8)}`}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="text-xs text-secondary mb-1 block">Message (optionnel)</label>
              <textarea value={giftMessage} onChange={e => setGiftMessage(e.target.value.slice(0, 200))} placeholder="Un petit mot..."
                rows={2} maxLength={200} className="w-full px-4 py-3 rounded-xl bg-[var(--surfaceElevated)] border border-[var(--border)] text-[var(--textPrimary)] text-sm outline-none focus:border-[var(--primary)] resize-none" />
              <p className="text-[10px] text-right text-secondary">{giftMessage.length}/200</p>
            </div>

            <button type="button" onClick={handleCheckout} disabled={!selectedMatch || sending}
              className="w-full py-3.5 rounded-full font-semibold text-on-primary disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background: 'var(--primary)' }}>
              {sending ? <><Loader size={16} className="animate-spin" /> Paiement en cours...</> : <><Send size={16} /> Payer {fmt(cartTotal)} F</>}
            </button>
          </div></FocusTrap>
        </div>
      )}
    </div>
  )
}
