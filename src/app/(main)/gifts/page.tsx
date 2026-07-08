'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Send, Smartphone, CreditCard, ChevronRight, Wallet, ArrowUpRight, History, CheckCircle, Clock } from 'lucide-react'
import { getGifts, getMatches, createGiftCheckout, getReceivedGifts, getPaymentAccount, savePaymentAccount, getCountries, getGiftBalance, getGiftTransactions, requestPayout } from '@/lib/api'
import type { GiftTransaction } from '@/lib/api'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'
import { FocusTrap } from '@/components/FocusTrap'
import { logger } from '@/lib/logger'

interface GiftItem { id: string; name: string; emoji: string; price_cents: number }
interface MatchItem { id: string; user1_id: string; user2_id: string }

const FEE_PERCENT = 15
const EUR_TO_XOF = 655.957
const toXof = (cents: number) => Math.round(cents * EUR_TO_XOF / 100)
const fmt = (n: number) => n.toLocaleString('fr-FR')
const countries = getCountries()

function GiftsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [gifts, setGifts] = useState<GiftItem[]>([])
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [myId, setMyId] = useState('')
  const [selectedGift, setSelectedGift] = useState<string | null>(null)
  const [selectedMatch, setSelectedMatch] = useState('')
  const [message, setMessage] = useState('')
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

  const countryOps = countries.find(c => c.code === payCountry)?.operators ?? []

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      toast('Paiement réussi ! Le cadeau a été envoyé.', 'success')
      router.replace('/gifts')
    }
  }, [searchParams, router, toast])

  const [initialLoad, setInitialLoad] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setMyId(data.user.id)
      const uid = data.user.id
      const [giftsData, receivedData, payAcc] = await Promise.all([
        getGifts(),
        getReceivedGifts(),
        getPaymentAccount(),
      ])
      if (giftsData.data) setGifts(giftsData.data)
      if (receivedData.data) setReceived(receivedData.data as typeof received)
      if (payAcc) {
        setSavedPayMethod(payAcc.type as 'mobile_money' | 'card')
        if (payAcc.type === 'mobile_money') {
          setPayPhone(payAcc.phone ?? ''); setPayOperator(payAcc.operator ?? 'Orange Money'); setPayCountry(payAcc.country ?? 'SN'); setPaySaved(true)
        } else if (payAcc.type === 'card') {
          setPayCardLast4(payAcc.card_last4 ?? ''); setPayCardBrand(payAcc.card_brand ?? ''); setPaySaved(true)
        }
      }
      const [matchData, balance, txns] = await Promise.all([
        getMatches(),
        getGiftBalance(),
        getGiftTransactions(),
      ])
      if (matchData.data) {
        setMatches(matchData.data)
        const otherIds = matchData.data.map(m => m.user1_id === uid ? m.user2_id : m.user1_id).filter(Boolean)
        if (otherIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', otherIds)
          if (profiles) {
            const names: Record<string, string> = {}
            for (const p of profiles) names[p.id] = p.name
            setMatchNames(names)
          }
        }
      }
      setBalance(balance)
      if (txns.data) setTransactions(txns.data)
      setInitialLoad(true)
    }).catch(() => { toast('Erreur chargement des cadeaux', 'error') })
  }, [toast])

  const getOtherId = (m: MatchItem) => m.user1_id === myId ? m.user2_id : m.user1_id
  const selectedGiftData = gifts.find(g => g.id === selectedGift)

  const handleSend = async () => {
    if (!selectedGift || !selectedMatch) return
    setSending(true)
    try {
      const match = matches.find(m => m.id === selectedMatch)
      if (!match) return
      const result = await createGiftCheckout(selectedGift, getOtherId(match), selectedMatch, message || undefined, payPhone || undefined, payOperator || undefined)
      if (result.data?.sent) {
        toast('Demande de paiement envoyée sur votre téléphone. Confirmez le paiement dans votre application Mobile Money.', 'success')
        setSelectedGift(null)
        return
      }
      if (result.data?.url) { window.location.href = result.data.url; return }
      toast(result.error ?? 'Erreur de paiement', 'error')
    } catch (err) {
      logger.error('handleSend error', { error: String(err) })
      toast('Erreur lors de l\'envoi du cadeau', 'error')
    } finally {
      setSending(false)
    }
  }

  const handlePayout = async () => {
    const amount = parseInt(payoutAmount)
    if (!amount || amount <= 0 || amount > balance) return
    setPayoutProcessing(true)
    try {
      const { error, message } = await requestPayout(amount)
      if (error) { toast(error, 'error'); return }
      toast(message ?? `Retrait de ${fmt(amount)} F effectué !`, 'success')
      setShowPayoutModal(false)
      setPayoutAmount('')
      const b = await getGiftBalance()
      setBalance(b)
      const t = await getGiftTransactions()
      if (t.data) setTransactions(t.data)
    } catch (err) {
      logger.error('handlePayout error', { error: String(err) })
      toast('Erreur lors du retrait', 'error')
    } finally {
      setPayoutProcessing(false)
    }
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
    setPaySaved(true)
    setShowPaymentConfig(false)
  }

  if (!initialLoad) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <h1 className="sr-only">Cadeaux</h1>
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Boutique cadeaux</h2>
      </header>
      <div className="flex-1 px-4 pb-8 overflow-y-auto space-y-4">
        <div className="glass-card rounded-2xl p-4 flex items-center gap-4 border border-[var(--warningVibrant)]/10">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--warningVibrant)] to-[var(--primary)] flex items-center justify-center shrink-0">
            <Wallet size={20} className="text-[var(--textOnPrimary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[var(--textSecondary)] uppercase tracking-wider">Mon portefeuille</p>
            <p className="text-2xl font-bold text-[var(--textPrimary)]">{fmt(balance)} F</p>
          </div>
          <button type="button" onClick={() => {
            if (balance <= 0) return
            if (!paySaved) { setShowPaymentConfig(true); return }
            setShowPayoutModal(true)
          }} disabled={balance <= 0}
            className="px-4 py-2 rounded-full text-xs font-semibold text-[var(--textOnPrimary)] disabled:opacity-30 flex items-center gap-1.5 transition-all active:scale-95" style={{ background: 'var(--primary)' }}>
            <ArrowUpRight size={14} /> Retirer
          </button>
        </div>

        {showPayoutModal && (
          <div aria-hidden="true" role="presentation" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={() => setShowPayoutModal(false)}
            onKeyDown={(e) => { if (e.key === 'Escape') setShowPayoutModal(false) }}>
            <FocusTrap active={showPayoutModal}><div role="dialog" aria-modal="true" tabIndex={-1} className="w-full max-w-sm bg-[var(--card)] rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-[var(--textPrimary)] mb-1">Retirer ton solde</h3>
              <p className="text-xs text-[var(--textSecondary)] mb-4">Solde disponible : <strong className="text-[var(--textPrimary)]">{fmt(balance)} F</strong></p>
              <div className="mb-3">
                <label className="text-xs text-[var(--textSecondary)] mb-1 block">Montant (F)</label>
                <input type="number" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} placeholder="5000" max={balance} aria-label="Montant du retrait"
                  className="w-full px-4 py-3 rounded-xl bg-[var(--surfaceElevated)] text-[var(--textPrimary)] text-sm border border-[var(--border)] outline-none focus:border-[var(--primary)]" />
              </div>
              <div className="mb-4">
                <label className="text-xs text-[var(--textSecondary)] mb-1 block">Moyen de retrait</label>
                <div className="px-4 py-3 rounded-xl bg-[var(--surfaceElevated)] text-[var(--textPrimary)] text-sm flex items-center gap-2">
                  {savedPayMethod === 'card' ? <CreditCard size={16} /> : <Smartphone size={16} />}
                  <span className="text-[var(--textSecondary)]">{savedPayMethod === 'card' ? `${payCardBrand} ···· ${payCardLast4}` : `${payOperator} — ${payPhone}`}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowPayoutModal(false)} className="flex-1 py-3 rounded-full text-sm font-medium border border-[var(--border)] text-[var(--textSecondary)]">Annuler</button>
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
          {savedPayMethod === 'card' ? <CreditCard size={20} className="text-[var(--textSecondary)]" /> : <Smartphone size={20} className="text-[var(--textSecondary)]" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Moyen de paiement</p>
            <p className="text-xs text-[var(--textSecondary)]">
              {paySaved ? (savedPayMethod === 'card' ? `${payCardBrand} ···· ${payCardLast4}` : `${payOperator} — ${payPhone}`) : 'Ajouter un moyen de paiement'}
            </p>
          </div>
          <ChevronRight size={16} className="text-[var(--textMuted)]" />
        </button>

        {showPaymentConfig && (
          <div className="glass-card rounded-xl p-4 space-y-3 animate-scale-in">
            <div className="flex gap-2">
              <button type="button" onClick={() => { setPayMethod('mobile_money'); setPaySaved(false) }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition ${payMethod === 'mobile_money' ? 'bg-[var(--primary)] text-[var(--textOnPrimary)]' : 'bg-[var(--surfaceElevated)] text-[var(--textSecondary)]'}`}>
                <Smartphone size={16} className="mx-auto mb-1" /> Mobile Money
              </button>
              <button type="button" onClick={() => { setPayMethod('card'); setPaySaved(false) }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition ${payMethod === 'card' ? 'bg-[var(--primary)] text-[var(--textOnPrimary)]' : 'bg-[var(--surfaceElevated)] text-[var(--textSecondary)]'}`}>
                <CreditCard size={16} className="mx-auto mb-1" /> Carte bancaire
              </button>
            </div>

            {payMethod === 'mobile_money' ? (
              <>
                <div>
                  <label className="text-xs text-[var(--textSecondary)] mb-1 block">Pays</label>
                  <select value={payCountry} onChange={e => { setPayCountry(e.target.value); setPayOperator(countries.find(c => c.code === e.target.value)?.operators[0] ?? '') }}
                    className="w-full px-3 py-2.5 rounded-lg bg-[var(--card)] text-[var(--textPrimary)] text-sm border border-[var(--border)] outline-none">
                    {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--textSecondary)] mb-1 block">Opérateur</label>
                  <select value={payOperator} onChange={e => setPayOperator(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[var(--card)] text-[var(--textPrimary)] text-sm border border-[var(--border)] outline-none">
                    {countryOps.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--textSecondary)] mb-1 block">Numéro de téléphone</label>
                  <input value={payPhone} onChange={e => setPayPhone(e.target.value)} placeholder="+221 77 123 45 67" aria-label="Numéro de téléphone"
                    className="w-full px-3 py-2.5 rounded-lg bg-[var(--card)] text-[var(--textPrimary)] text-sm border border-[var(--border)] outline-none focus:border-[var(--primary)]" />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[var(--textSecondary)] text-center">Carte bancaire — les paiements sont sécurisés via PayDunya.</p>
                <div>
                  <label className="text-xs text-[var(--textSecondary)] mb-1 block">4 derniers chiffres</label>
                  <input value={payCardLast4} onChange={e => setPayCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" maxLength={4} inputMode="numeric" aria-label="4 derniers chiffres de la carte"
                    className="w-full px-3 py-2.5 rounded-lg bg-[var(--card)] text-[var(--textPrimary)] text-sm border border-[var(--border)] outline-none focus:border-[var(--primary)]" />
                </div>
                <div>
                  <label className="text-xs text-[var(--textSecondary)] mb-1 block">Marque</label>
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
            <p className="text-sm text-[var(--textSecondary)]">Aucun cadeau disponible pour le moment.</p>
          </div>
        ) : (
        <div className="grid grid-cols-3 gap-3">
          {gifts.map(g => (
            <button type="button" key={g.id} onClick={() => setSelectedGift(g.id)}
              className={`bg-[var(--card)] rounded-xl border p-3 text-center transition-all duration-200 hover:scale-[1.03] active:scale-95 ${selectedGift === g.id ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]' : 'border-[var(--border)]'}`}>
              <span className="text-3xl block mb-1 transition-transform duration-200 group-hover:scale-110">{g.emoji || '🎁'}</span>
              <p className="text-[10px] font-medium truncate">{g.name}</p>
              <p className="text-[10px] text-[var(--primary)] font-bold">{fmt(toXof(g.price_cents))} F</p>
              <p className="text-[8px] text-[var(--textSecondary)]">+{FEE_PERCENT}% frais</p>
            </button>
          ))}
        </div>
        )}

        {selectedGift && selectedGiftData && (
          <div className="glass-card rounded-xl p-4 space-y-3 animate-scale-in">
            <p className="text-sm text-center">
              <strong>{selectedGiftData.name}</strong> — Total : <strong className="text-[var(--primary)]">{fmt(toXof(selectedGiftData.price_cents * (1 + FEE_PERCENT / 100)))} F</strong>
              <br /><span className="text-xs text-[var(--textSecondary)]">dont {FEE_PERCENT}% de frais</span>
            </p>
            <div>
              <label className="text-xs text-[var(--textSecondary)] mb-1 block">Destinataire</label>
              <select value={selectedMatch} onChange={e => setSelectedMatch(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--textPrimary)] text-sm outline-none">
                <option value="">Sélectionner un match...</option>
                {matches.map(m => (
                  <option key={m.id} value={m.id}>{matchNames[getOtherId(m)] ?? `Match #${m.id.slice(0, 8)}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--textSecondary)] mb-1 block">Message (optionnel)</label>
              <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 200))} placeholder="Un petit mot..."
                rows={2} maxLength={200} className="w-full px-4 py-3 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--textPrimary)] text-sm outline-none focus:border-[var(--primary)] resize-none" />
              <p className="text-[10px] text-right text-[var(--textSecondary)]">{message.length}/200</p>
            </div>
            <button type="button" onClick={handleSend} disabled={!selectedMatch || sending}
              className="w-full py-3.5 rounded-full font-semibold text-[var(--textOnPrimary)] disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95" style={{ background: 'var(--primary)' }}>
              <Send size={16} /> {sending ? 'Paiement en cours...' : `Payer ${fmt(toXof(selectedGiftData.price_cents * (1 + FEE_PERCENT / 100)))} F`}
            </button>
          </div>
        )}

        {transactions.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[var(--textSecondary)] uppercase tracking-wider mb-2 px-1 flex items-center gap-2">
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
                      <p className="text-[10px] text-[var(--textSecondary)]">{new Date(t.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${isCredit ? 'text-[var(--successVibrant)]' : 'text-[var(--primary)]'}`}>
                        {isCredit ? '+' : '-'}{fmt(t.amount_cents)} F
                      </p>
                      <p className={`text-[10px] ${t.status === 'completed' ? 'text-[var(--successVibrant)]' : t.status === 'pending' ? 'text-[var(--warningVibrant)]' : 'text-[var(--textSecondary)]'}`}>
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
            <h3 className="text-sm font-semibold text-[var(--textSecondary)] uppercase tracking-wider mb-2 px-1">Cadeaux reçus</h3>
            <div className="space-y-2">
              {received.slice(0, 5).map(r => (
                <div key={r.id} className="glass-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:scale-[1.01]">
                  <span className="text-2xl">{r.gift?.emoji || '🎁'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.gift?.name || 'Cadeau'}</p>
                    <p className="text-xs text-[var(--textSecondary)]">De {r.sender?.name || 'Inconnu'}</p>
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
      </div>
    </div>
  )
}

export default function GiftsPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} /></div>}>
      <GiftsContent />
    </Suspense>
  )
}
