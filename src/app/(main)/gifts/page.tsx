'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Send, Smartphone, CreditCard, ChevronRight } from 'lucide-react'
import { getGifts, getMatches, createGiftCheckout, getReceivedGifts, getPaymentAccount, savePaymentAccount, getCountries } from '@/lib/api'
import { supabase } from '@/lib/supabase/client'

interface GiftItem { id: string; name: string; emoji: string; price_cents: number }
interface MatchItem { id: string; user1_id: string; user2_id: string }

const FEE_PERCENT = 15
const countries = getCountries()

function GiftsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
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

  const countryOps = countries.find(c => c.code === payCountry)?.operators ?? []

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      alert('Paiement réussi ! Le cadeau a été envoyé.')
      router.replace('/gifts')
    }
  }, [searchParams, router])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setMyId(data.user.id) }).catch(() => {})
    getGifts().then(({ data }) => { if (data) setGifts(data) }).catch(() => {})
    getMatches().then(({ data }) => { if (data) setMatches(data) }).catch(() => {})
    getReceivedGifts().then(({ data }) => { setReceived(data as typeof received) }).catch(() => {})
    getPaymentAccount().then(acc => {
      if (acc) {
        setSavedPayMethod(acc.type)
        if (acc.type === 'mobile_money') {
          setPayPhone(acc.phone ?? ''); setPayOperator(acc.operator ?? 'Orange Money'); setPayCountry(acc.country ?? 'SN'); setPaySaved(true)
        } else if (acc.type === 'card') {
          setPayCardLast4(acc.card_last4 ?? ''); setPayCardBrand(acc.card_brand ?? ''); setPaySaved(true)
        }
      }
    }).catch(() => {})
  }, [])

  const getOtherId = (m: MatchItem) => m.user1_id === myId ? m.user2_id : m.user1_id
  const selectedGiftData = gifts.find(g => g.id === selectedGift)

  const handleSend = async () => {
    if (!selectedGift || !selectedMatch) return
    setSending(true)
    const match = matches.find(m => m.id === selectedMatch)
    if (!match) return
    const result = await createGiftCheckout(selectedGift, getOtherId(match), selectedMatch, message || undefined)
    if (result.url) { window.location.href = result.url; return }
    alert(result.error ?? 'Erreur de paiement')
    setSending(false)
  }

  const handleSavePayment = async () => {
    if (payMethod === 'mobile_money') {
      if (!payPhone || payPhone.length < 8) return
      const { error } = await savePaymentAccount({ type: 'mobile_money', phone: payPhone, operator: payOperator, country: payCountry })
      if (error) { alert(error); return }
    } else {
      const last4 = prompt('Les 4 derniers chiffres de ta carte :')
      if (!last4 || last4.length < 4) return
      const brand = prompt('Marque (Visa, Mastercard...) :') || 'Carte'
      const { error } = await savePaymentAccount({ type: 'card', card_last4: last4, card_brand: brand })
      if (error) { alert(error); return }
      setPayCardLast4(last4); setPayCardBrand(brand)
    }
    setPaySaved(true)
    setShowPaymentConfig(false)
  }

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button onClick={() => router.back()} aria-label="Retour" className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Boutique cadeaux</h2>
      </header>
      <div className="flex-1 px-4 pb-8 overflow-y-auto space-y-4">
        <button onClick={() => setShowPaymentConfig(!showPaymentConfig)}
          className="w-full glass-card rounded-xl px-4 py-3 flex items-center gap-3 text-left">
          {savedPayMethod === 'card' ? <CreditCard size={20} className="text-[#6B6258]" /> : <Smartphone size={20} className="text-[#6B6258]" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Moyen de paiement</p>
            <p className="text-xs text-[#9E9488]">
              {paySaved ? (savedPayMethod === 'card' ? `${payCardBrand} ···· ${payCardLast4}` : `${payOperator} — ${payPhone}`) : 'Ajouter un moyen de paiement'}
            </p>
          </div>
          <ChevronRight size={16} className="text-[#5A5248]" />
        </button>

        {showPaymentConfig && (
          <div className="glass-card rounded-xl p-4 space-y-3 animate-scale-in">
            <div className="flex gap-2">
              <button onClick={() => { setPayMethod('mobile_money'); setPaySaved(false) }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition ${payMethod === 'mobile_money' ? 'bg-[#D92D4A] text-white' : 'bg-[#262628] text-[#9E9488]'}`}>
                <Smartphone size={16} className="mx-auto mb-1" /> Mobile Money
              </button>
              <button onClick={() => { setPayMethod('card'); setPaySaved(false) }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition ${payMethod === 'card' ? 'bg-[#D92D4A] text-white' : 'bg-[#262628] text-[#9E9488]'}`}>
                <CreditCard size={16} className="mx-auto mb-1" /> Carte bancaire
              </button>
            </div>

            {payMethod === 'mobile_money' ? (
              <>
                <div>
                  <label className="text-xs text-[#9E9488] mb-1 block">Pays</label>
                  <select value={payCountry} onChange={e => { setPayCountry(e.target.value); setPayOperator(countries.find(c => c.code === e.target.value)?.operators[0] ?? '') }}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#1C1C1E] text-white text-sm border border-[#2A2826] outline-none">
                    {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#9E9488] mb-1 block">Opérateur</label>
                  <select value={payOperator} onChange={e => setPayOperator(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#1C1C1E] text-white text-sm border border-[#2A2826] outline-none">
                    {countryOps.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#9E9488] mb-1 block">Numéro de téléphone</label>
                  <input value={payPhone} onChange={e => setPayPhone(e.target.value)} placeholder="+221 77 123 45 67"
                    className="w-full px-3 py-2.5 rounded-lg bg-[#1C1C1E] text-white text-sm border border-[#2A2826] outline-none focus:border-[#D92D4A]" />
                </div>
              </>
            ) : (
              <p className="text-xs text-[#9E9488] text-center py-4">
                Carte bancaire — les paiements sont sécurisés via PayDunya. Ajoute une carte pour recevoir et envoyer des cadeaux.
              </p>
            )}

            <button onClick={handleSavePayment}
              className="w-full py-2.5 rounded-full text-white text-sm font-semibold" style={{ background: '#D92D4A' }}>
              {paySaved ? 'Modifier' : 'Enregistrer'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {gifts.map(g => (
            <button key={g.id} onClick={() => setSelectedGift(g.id)}
              className={`bg-[#1C1C1E] rounded-xl border p-3 text-center transition-all duration-200 hover:scale-[1.03] active:scale-95 ${selectedGift === g.id ? 'border-[#D92D4A] ring-1 ring-[#D92D4A]' : 'border-[#2A2826]'}`}>
              <span className="text-3xl block mb-1 transition-transform duration-200 group-hover:scale-110">{g.emoji || '🎁'}</span>
              <p className="text-[10px] font-medium truncate">{g.name}</p>
              <p className="text-[10px] text-[#D92D4A] font-bold">{g.price_cents / 100}€</p>
              <p className="text-[8px] text-[#6B6258]">+{FEE_PERCENT}% frais</p>
            </button>
          ))}
        </div>

        {selectedGift && selectedGiftData && (
          <div className="glass-card rounded-xl p-4 space-y-3 animate-scale-in">
            <p className="text-sm text-center">
              <strong>{selectedGiftData.name}</strong> — Total : <strong className="text-[#D92D4A]">{(selectedGiftData.price_cents * (1 + FEE_PERCENT/100)) / 100}€</strong>
              <br /><span className="text-xs text-[#6B6258]">(dont {FEE_PERCENT}% de frais de service)</span>
            </p>
            <div>
              <label className="text-xs text-[#9E9488] mb-1 block">Destinataire</label>
              <select value={selectedMatch} onChange={e => setSelectedMatch(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1C1C1E] border border-[#2A2826] text-white text-sm outline-none">
                <option value="">Sélectionner un match...</option>
                {matches.map(m => (
                  <option key={m.id} value={m.id}>Match #{m.id.slice(0, 8)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#9E9488] mb-1 block">Message (optionnel)</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Un petit mot..."
                rows={2} className="w-full px-4 py-3 rounded-xl bg-[#1C1C1E] border border-[#2A2826] text-white text-sm outline-none focus:border-[#D92D4A] resize-none" />
            </div>
            <button onClick={handleSend} disabled={!selectedMatch || sending}
              className="w-full py-3.5 rounded-full font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95" style={{ background: '#D92D4A' }}>
              <Send size={16} /> {sending ? 'Paiement en cours...' : `Payer ${(selectedGiftData.price_cents * (1 + FEE_PERCENT/100)) / 100}€`}
            </button>
          </div>
        )}

        {received.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[#9E9488] uppercase tracking-wider mb-2 px-1">Cadeaux reçus</h3>
            <div className="space-y-2">
              {received.slice(0, 5).map(r => (
                <div key={r.id} className="glass-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:scale-[1.01]">
                  <span className="text-2xl">{r.gift?.emoji || '🎁'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.gift?.name || 'Cadeau'}</p>
                    <p className="text-xs text-[#9E9488]">De {r.sender?.name || 'Inconnu'}</p>
                  </div>
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
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#D92D4A', borderTopColor: 'transparent' }} /></div>}>
      <GiftsContent />
    </Suspense>
  )
}
