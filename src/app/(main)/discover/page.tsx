'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Flame, MessageCircle, X, Heart, Star, Globe, SlidersHorizontal } from 'lucide-react'
import { getProfiles, getSwipedIds, createSwipe, checkForMatch, getProfile, type Profile } from '@/lib/api'

const SUPER_LIKE_DAILY = 3

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [matchModal, setMatchModal] = useState<{ profile: Profile; matchId: string } | null>(null)
  const [superLikesLeft, setSuperLikesLeft] = useState(SUPER_LIKE_DAILY)
  const [showFilters, setShowFilters] = useState(false)
  const router = useRouter()

  const load = useCallback(async () => {
    setLoading(true)
    const swiped = await getSwipedIds()
    const { data } = await getProfiles(swiped)
    if (data) setProfiles(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const stored = localStorage.getItem('erosia_superlikes_date')
    const today = new Date().toDateString()
    if (stored !== today) {
      localStorage.setItem('erosia_superlikes_date', today)
      localStorage.setItem('erosia_superlikes_count', '0')
      setSuperLikesLeft(SUPER_LIKE_DAILY)
    } else {
      const count = parseInt(localStorage.getItem('erosia_superlikes_count') ?? '0', 10)
      setSuperLikesLeft(SUPER_LIKE_DAILY - count)
    }
  }, [])

  const swipe = async (dir: 'like' | 'pass' | 'super_like') => {
    const p = profiles[idx]
    if (!p) return
    if (dir === 'super_like') {
      if (superLikesLeft <= 0) return
      setSuperLikesLeft((s) => s - 1)
      const c = parseInt(localStorage.getItem('erosia_superlikes_count') ?? '0', 10)
      localStorage.setItem('erosia_superlikes_count', String(c + 1))
    }
    await createSwipe(p.id, dir)
    if (dir === 'like' || dir === 'super_like') {
      const { isMatch, match } = await checkForMatch(p.id)
      if (isMatch && match) setMatchModal({ profile: p, matchId: match.id })
    }
    const next = idx + 1
    if (next >= profiles.length) { await load(); setIdx(0) }
    else setIdx(next)
  }

  const current = profiles[idx]

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#FF3B5C', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="text-2xl font-extrabold tracking-wide" style={{ color: '#FF3B5C' }}>Erosia</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowFilters(!showFilters)} className="p-2"><SlidersHorizontal size={20} /></button>
          <button onClick={() => router.push('/matches')} className="p-2"><MessageCircle size={20} /></button>
        </div>
      </header>

      {showFilters && (
        <div className="mx-4 mb-3 p-4 bg-zinc-50 rounded-2xl flex gap-4 items-center text-sm">
          <select className="bg-white border rounded-lg px-3 py-2"><option>18-25</option><option>25-35</option><option>35-50</option></select>
          <select className="bg-white border rounded-lg px-3 py-2"><option>5 km</option><option selected>15 km</option><option>50 km</option></select>
          <button onClick={() => setShowFilters(false)} className="text-rose-500 font-medium ml-auto">OK</button>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-2">
        {!current ? (
          <div className="text-center">
            <Globe size={64} className="text-zinc-300 mx-auto mb-4" />
            <p className="text-lg font-semibold">Plus de profils</p>
            <p className="text-zinc-400 text-sm mt-1">Reviens plus tard ou modifie tes filtres</p>
          </div>
        ) : (
          <div className="w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden relative shadow-lg bg-zinc-100">
            <img src={current.photos?.[0] ?? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'} alt={current.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

            <div className="absolute bottom-20 left-4 right-4">
              <div className="flex items-center gap-1.5">
                <h2 className="text-2xl font-bold text-white">{current.name}</h2>
                {current.age && <span className="text-xl text-white/90">{current.age}</span>}
              </div>
              {current.location && <p className="text-white/80 text-sm">{current.location}</p>}
            </div>

            {current.interests && current.interests.length > 0 && (
              <div className="absolute bottom-32 left-4 flex gap-1.5">
                {current.interests.slice(0, 3).map((i) => (
                  <span key={i} className="text-xs text-white bg-white/20 px-2.5 py-0.5 rounded-full">{i}</span>
                ))}
              </div>
            )}

            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-5">
              <button onClick={() => swipe('pass')} className="w-14 h-14 rounded-full bg-white shadow-md flex items-center justify-center">
                <X size={28} className="text-red-500" />
              </button>
              <button onClick={() => swipe('super_like')} className="w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center">
                <Star size={22} className="text-indigo-500" />
              </button>
              <button onClick={() => swipe('like')} className="w-14 h-14 rounded-full bg-white shadow-md flex items-center justify-center">
                <Heart size={28} className="text-green-500" />
              </button>
            </div>
          </div>
        )}
      </div>

      {matchModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center animate-bounce-in">
            <Heart size={72} className="mx-auto mb-4" style={{ color: '#FF3B5C' }} fill="#FF3B5C" />
            <h2 className="text-3xl font-bold" style={{ color: '#FF3B5C' }}>C'est un match !</h2>
            <p className="text-zinc-500 mt-1">Vous vous êtes mutuellement likés</p>
            <div className="flex items-center justify-center gap-4 my-6">
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330" className="w-20 h-20 rounded-full border-2 border-rose-500 object-cover" />
              <Heart size={24} className="text-rose-500" fill="#FF3B5C" />
              <img src={matchModal.profile.photos?.[0] ?? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d'} className="w-20 h-20 rounded-full border-2 border-rose-500 object-cover" />
            </div>
            <p className="font-semibold mb-6">{matchModal.profile.name}</p>
            <button onClick={() => { router.push(`/chat/${matchModal.matchId}`); setMatchModal(null) }}
              className="w-full py-3.5 rounded-full text-white font-semibold" style={{ background: '#FF3B5C' }}>
              Envoyer un message
            </button>
            <button onClick={() => setMatchModal(null)} className="w-full py-3 mt-2 text-zinc-500 text-sm">Continuer à swiper</button>
          </div>
        </div>
      )}
    </div>
  )
}
