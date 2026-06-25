'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Lock } from 'lucide-react'
import { getGifts, sendGift, getMatches, checkPremium } from '@/lib/api'
import { supabase } from '@/lib/supabase/client'

export default function GiftsPage() {
  const router = useRouter()
  const [gifts, setGifts] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [myId, setMyId] = useState('')
  const [selectedGift, setSelectedGift] = useState<string | null>(null)
  const [selectedMatch, setSelectedMatch] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setMyId(data.user.id)
    })
    checkPremium().then(setIsPremium)
    getGifts().then(({ data }) => { if (data) setGifts(data) })
    getMatches().then(({ data }) => {
      if (data) setMatches(data)
    })
  }, [])

  const getOtherId = (m: any) => m.user1_id === myId ? m.user2_id : m.user1_id

  const handleSend = async () => {
    if (!selectedGift || !selectedMatch) return
    setSending(true)
    const match = matches.find(m => m.id === selectedMatch)
    if (!match) return
    await sendGift(getOtherId(match), selectedGift, selectedMatch, message || undefined)
    setSending(false)
    setSelectedGift(null)
    setSelectedMatch('')
    setMessage('')
  }

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button onClick={() => router.back()} className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Boutique cadeaux</h2>
      </header>
      <div className="flex-1 px-4 pb-8 overflow-y-auto space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {gifts.map(g => (
            <button key={g.id} onClick={() => setSelectedGift(g.id)}
              className={`bg-[#1C1C1E] rounded-xl border p-3 text-center transition ${selectedGift === g.id ? 'border-[#D92D4A] ring-1 ring-[#D92D4A]' : 'border-[#2A2826]'}`}>
              <span className="text-3xl block mb-1">{g.emoji || '🎁'}</span>
              <p className="text-[10px] font-medium truncate">{g.name}</p>
              <p className="text-[10px] text-[#D92D4A] font-bold">{g.price_cents / 100}€</p>
            </button>
          ))}
        </div>

        {selectedGift && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#9E9488] mb-1 block">Destinataire (match)</label>
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
            {isPremium ? (
              <button onClick={handleSend} disabled={!selectedMatch || sending}
                className="w-full py-3.5 rounded-full font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: '#D92D4A' }}>
                <Send size={16} /> {sending ? 'Envoi...' : 'Envoyer le cadeau'}
              </button>
            ) : (
              <button onClick={() => router.push('/settings')}
                className="w-full py-3.5 rounded-full font-semibold text-white flex items-center justify-center gap-2 bg-[#262628]">
                <Lock size={16} /> Premium requis
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
