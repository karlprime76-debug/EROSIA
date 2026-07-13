'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Smartphone, CreditCard, Loader } from 'lucide-react'
import { getCart, clearCart, cartTotal, type CartItem } from '@/lib/cart-storage'
import { supabase } from '@/lib/supabase/client'
import { getMatches, createCartCheckout, getPaymentAccount, savePaymentAccount, getCountries } from '@/lib/api'
import { useToast } from '@/components/Toast'


interface MatchItem { id: string; user1_id: string; user2_id: string }

const fmt = (n: number) => n.toLocaleString('fr-FR')
const countries = getCountries()

export default function CheckoutPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [cart, setCart] = useState<CartItem[]>([])
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [myId, setMyId] = useState('')
  const [selectedMatch, setSelectedMatch] = useState('')
  const [matchNames, setMatchNames] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [payMethod, setPayMethod] = useState<'mobile_money' | 'card'>('mobile_money')
  const [payCountry, setPayCountry] = useState('SN')
  const [payOperator, setPayOperator] = useState('Orange Money')
  const [payPhone, setPayPhone] = useState('')
  const [paySaved, setPaySaved] = useState(false)
  const [payCardLast4, setPayCardLast4] = useState('')
  const [payCardBrand, setPayCardBrand] = useState('')
  const [savedPayMethod, setSavedPayMethod] = useState<'mobile_money' | 'card' | null>(null)
  const [showPaymentConfig, setShowPaymentConfig] = useState(false)

  const countryOps = countries.find(c => c.code === payCountry)?.operators ?? []

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      const items = getCart()
      if (cancelled) return
      setCart(items)
      if (items.length === 0) { router.replace('/gifts/cart'); return }

      supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return
      if (!data.user) { router.push('/login'); return }
      setMyId(data.user.id)
      const uid = data.user.id
      const [matchData, payAcc] = await Promise.all([getMatches(), getPaymentAccount()])
      if (cancelled) return
      if (matchData.data) {
        setMatches(matchData.data)
        const otherIds = matchData.data.map(m => m.user1_id === uid ? m.user2_id : m.user1_id).filter(Boolean)
        if (otherIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', otherIds)
          if (profiles) { const names: Record<string, string> = {}; for (const p of profiles) names[p.id] = p.name; setMatchNames(names) }
        }
      }
      if (payAcc) {
        setSavedPayMethod(payAcc.type as 'mobile_money' | 'card')
        if (payAcc.type === 'mobile_money') { setPayPhone(payAcc.phone ?? ''); setPayOperator(payAcc.operator ?? 'Orange Money'); setPayCountry(payAcc.country ?? 'SN'); setPaySaved(true) }
        else if (payAcc.type === 'card') { setPayCardLast4(payAcc.card_last4 ?? ''); setPayCardBrand(payAcc.card_brand ?? ''); setPaySaved(true) }
      }
      })
    }, 0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [router])

  const total = cartTotal(cart)

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

  const handleCheckout = useCallback(async () => {
    if (!selectedMatch || cart.length === 0) return
    setSending(true)
    try {
      const match = matches.find(m => m.id === selectedMatch)
      if (!match) return
      const result = await createCartCheckout(cart.map(g => g.id), match.user1_id === myId ? match.user2_id : match.user1_id, selectedMatch, message || undefined, payPhone || undefined, payOperator || undefined)
      if (result.error) { toast(result.error, 'error'); setSending(false); return }
      if (result.data?.sent) {
        toast('Demande de paiement envoyée sur votre téléphone.', 'success')
        clearCart()
        router.push('/gifts')
        return
      }
      if (result.data?.url) {
        clearCart()
        window.location.href = result.data.url
        return
      }
    } catch { toast('Erreur lors de l\'envoi', 'error') }
    finally { setSending(false) }
  }, [selectedMatch, cart, matches, myId, message, payPhone, payOperator, toast, router])

  if (cart.length === 0) return null

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.push('/gifts/cart')} aria-label="Retour" className="p-2.5 rounded-xl"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Commander</h2>
      </header>
      <div className="flex-1 px-4 pb-8 overflow-y-auto space-y-4">
        <div className="space-y-2">
          {cart.map(g => (
            <div key={g.id} className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">{g.emoji || '🎁'}</span>
              <span className="flex-1 text-sm font-medium">{g.name}</span>
              <span className="text-sm font-bold text-primary">{fmt(Math.round(g.price_cents * 655.957 / 100))} F</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-base font-black text-primary">{fmt(total)} F</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 space-y-3">
          <p className="text-xs text-secondary uppercase tracking-wider font-semibold">Destinataire</p>
          <select value={selectedMatch} onChange={e => setSelectedMatch(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[var(--surfaceElevated)] border border-[var(--border)] text-sm outline-none">
            <option value="">Sélectionner un match...</option>
            {matches.map(m => (
              <option key={m.id} value={m.id}>{matchNames[m.user1_id === myId ? m.user2_id : m.user1_id] ?? `Match #${m.id.slice(0, 8)}`}</option>
            ))}
          </select>
        </div>

        <div className="glass-card rounded-2xl p-4 space-y-3">
          <p className="text-xs text-secondary uppercase tracking-wider font-semibold">Message (optionnel)</p>
          <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 200))} placeholder="Un petit mot..."
            rows={2} maxLength={200} className="w-full px-4 py-3 rounded-xl bg-[var(--surfaceElevated)] border border-[var(--border)] text-sm outline-none focus:border-[var(--primary)] resize-none" />
          <p className="text-[10px] text-right text-secondary">{message.length}/200</p>
        </div>

        <button type="button" onClick={() => setShowPaymentConfig(!showPaymentConfig)}
          className="w-full glass-card rounded-2xl px-4 py-3 flex items-center gap-3 text-left">
          {savedPayMethod === 'card' ? <CreditCard size={20} className="text-secondary" /> : <Smartphone size={20} className="text-secondary" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Moyen de paiement</p>
            <p className="text-xs text-secondary">{paySaved ? (savedPayMethod === 'card' ? `${payCardBrand} ···· ${payCardLast4}` : `${payOperator} — ${payPhone}`) : 'Configurer le paiement'}</p>
          </div>
        </button>

        {showPaymentConfig && (
          <div className="glass-card rounded-2xl p-4 space-y-3 animate-scale-in">
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
                    className="w-full px-3 py-2.5 rounded-lg bg-[var(--card)] text-sm border border-[var(--border)] outline-none">
                    {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-secondary mb-1 block">Opérateur</label>
                  <select value={payOperator} onChange={e => setPayOperator(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[var(--card)] text-sm border border-[var(--border)] outline-none">
                    {countryOps.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-secondary mb-1 block">Numéro de téléphone</label>
                  <input value={payPhone} onChange={e => setPayPhone(e.target.value)} placeholder="+221 77 123 45 67"
                    className="w-full px-3 py-2.5 rounded-lg bg-[var(--card)] text-sm border border-[var(--border)] outline-none focus:border-[var(--primary)]" />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-secondary text-center">Carte bancaire — les paiements sont sécurisés via PayDunya.</p>
                <div>
                  <label className="text-xs text-secondary mb-1 block">4 derniers chiffres</label>
                  <input value={payCardLast4} onChange={e => setPayCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" maxLength={4} inputMode="numeric"
                    className="w-full px-3 py-2.5 rounded-lg bg-[var(--card)] text-sm border border-[var(--border)] outline-none focus:border-[var(--primary)]" />
                </div>
                <div>
                  <label className="text-xs text-secondary mb-1 block">Marque</label>
                  <select value={payCardBrand} onChange={e => setPayCardBrand(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[var(--card)] text-sm border border-[var(--border)] outline-none">
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
              className="w-full py-2.5 rounded-full text-on-primary text-sm font-semibold" style={{ background: 'var(--primary)' }}>
              {paySaved ? 'Modifier' : 'Enregistrer'}
            </button>
          </div>
        )}

        <button type="button" onClick={handleCheckout} disabled={!selectedMatch || sending}
          className="w-full py-3.5 rounded-full font-semibold text-on-primary disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95"
          style={{ background: 'var(--primary)' }}>
          {sending ? <><Loader size={16} className="animate-spin" /> Paiement en cours...</> : <><Send size={16} /> Payer {fmt(total)} F</>}
        </button>
      </div>
    </div>
  )
}
