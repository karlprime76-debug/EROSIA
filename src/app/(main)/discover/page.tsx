'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { MessageCircle, X, Heart, Star, Globe, SlidersHorizontal, Eye, Shield, BadgeCheck, RotateCcw } from 'lucide-react'
import { getProfiles, getSwipedIds, createSwipe, checkForMatch, sendFlirt, getSentFlirtIds, blockProfile, getBlockedIds, deleteLastSwipe, getLastSwipe, type Profile } from '@/lib/api'
import { TiltCard } from '@/components/3d/TiltCard'
import { MatchBurst } from '@/components/3d/MatchBurst'

const SUPER_LIKE_DAILY = 3

function getInitialSuperLikes(): number {
  if (typeof window === 'undefined') return SUPER_LIKE_DAILY
  const stored = localStorage.getItem('erosia_superlikes_date')
  const today = new Date().toDateString()
  if (stored !== today) return SUPER_LIKE_DAILY
  const count = parseInt(localStorage.getItem('erosia_superlikes_count') ?? '0', 10)
  return SUPER_LIKE_DAILY - count
}

const lookingForLabel = (v: string) => ({ friendship: 'Amitié', casual: 'Plan cul', fwb: 'FWB', serious: 'Sérieux', open: 'Libre' }[v] ?? v)

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [matchModal, setMatchModal] = useState<{ profile: Profile; matchId: string } | null>(null)
  const [superLikesLeft, setSuperLikesLeft] = useState(getInitialSuperLikes)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ minAge: 18, maxAge: 99, lookingFor: '' })
  const [flirtedIds, setFlirtedIds] = useState<string[]>([])
  const [blockedIds, setBlockedIds] = useState<string[]>([])
  const [hasSwiped, setHasSwiped] = useState(false)
  const router = useRouter()

  useEffect(() => {
    Promise.all([getSwipedIds(), getBlockedIds(), getLastSwipe()])
      .then(([swiped, blocked, last]) => {
        setBlockedIds(blocked)
        setHasSwiped(!!last)
        return getProfiles([...swiped, ...blocked], { minAge: 18, maxAge: 99 })
      })
      .then(({ data }) => {
        setTimeout(() => {
          if (data) setProfiles(data)
          setLoading(false)
        })
      })
    getSentFlirtIds().then(ids => setFlirtedIds(ids))
  }, [])

  const swipe = async (dir: 'like' | 'pass' | 'super_like') => {
    const p = profiles[idx]
    if (!p) return
    if (dir === 'super_like') {
      if (superLikesLeft <= 0) return
      setSuperLikesLeft((s) => s - 1)
      const today = new Date().toDateString()
      if (localStorage.getItem('erosia_superlikes_date') !== today) {
        localStorage.setItem('erosia_superlikes_date', today)
        localStorage.setItem('erosia_superlikes_count', '0')
      }
      const c = parseInt(localStorage.getItem('erosia_superlikes_count') ?? '0', 10)
      localStorage.setItem('erosia_superlikes_count', String(c + 1))
    }
    await createSwipe(p.id, dir)
    setHasSwiped(true)
    if (dir === 'like' || dir === 'super_like') {
      const { isMatch, match } = await checkForMatch(p.id)
      if (isMatch && match) setMatchModal({ profile: p, matchId: match.id })
    }
    const next = idx + 1
    if (next >= profiles.length) {
      setProfiles([])
      setIdx(0)
      const swiped = await getSwipedIds()
      const { data } = await getProfiles([...swiped, ...blockedIds], { ...filters, lookingFor: filters.lookingFor || undefined })
      if (data) setProfiles(data)
    } else {
      setIdx(next)
    }
  }

  const handleRewind = async () => {
    const last = await getLastSwipe()
    if (!last) { setHasSwiped(false); return }
    await deleteLastSwipe()
    const swiped = await getSwipedIds()
    const { data } = await getProfiles([...swiped, ...blockedIds], { ...filters, lookingFor: filters.lookingFor || undefined })
    if (data) setProfiles(data)
    setIdx(0)
    setHasSwiped(swiped.length > 0)
  }

  const current = profiles[idx]

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#D92D4A', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <Image src="/logo.png" alt="Erosia" width={100} height={33} />
        <div className="flex items-center gap-3">
          {hasSwiped && <button onClick={handleRewind} className="p-2"><RotateCcw size={20} /></button>}
          <button onClick={() => setShowFilters(!showFilters)} className="p-2"><SlidersHorizontal size={20} /></button>
          <button onClick={() => router.push('/matches')} className="p-2"><MessageCircle size={20} /></button>
        </div>
      </header>

      {showFilters && (
        <div className="mx-4 mb-3 p-4 bg-[#1A1A1C] rounded-2xl space-y-3 text-sm">
          <div>
            <label className="text-xs font-medium text-[#9E9488] mb-1 block">Âge : {filters.minAge} – {filters.maxAge} ans</label>
            <div className="flex gap-3 items-center">
              <input type="range" min={18} max={70} value={filters.minAge}
                onChange={e => setFilters(f => ({ ...f, minAge: Number(e.target.value) }))}
                className="flex-1 accent-[#D92D4A]" />
              <span className="text-[#5A5248]">–</span>
              <input type="range" min={18} max={70} value={filters.maxAge}
                onChange={e => setFilters(f => ({ ...f, maxAge: Number(e.target.value) }))}
                className="flex-1 accent-[#D92D4A]" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[#9E9488] mb-1 block">Type de relation</label>
            <select value={filters.lookingFor} onChange={e => setFilters(f => ({ ...f, lookingFor: e.target.value }))}
              className="w-full bg-[#1C1C1E] text-[#F5F0EB] border border-[#2A2826] rounded-lg px-3 py-2 text-sm">
              <option value="">Tout</option>
              <option value="friendship">Amitié</option>
              <option value="casual">Plan cul</option>
              <option value="fwb">Friends with benefits</option>
              <option value="serious">Relation sérieuse</option>
              <option value="open">Relation libre</option>
            </select>
          </div>
          <button onClick={() => {
            setShowFilters(false); setLoading(true)
            Promise.all([getSwipedIds(), getBlockedIds()]).then(([swiped, blocked]) => {
              setBlockedIds(blocked)
              return getProfiles([...swiped, ...blocked], { ...filters, lookingFor: filters.lookingFor || undefined })
            }).then(({ data }) => {
              setTimeout(() => {
                if (data) setProfiles(data)
                setLoading(false)
              })
            })
          }}
            className="w-full py-2.5 rounded-full text-white font-semibold text-sm" style={{ background: '#D92D4A' }}>
            Appliquer les filtres
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-2">
        {!current ? (
          <div className="text-center">
            <Globe size={64} className="text-[#5A5248] mx-auto mb-4" />
            <p className="text-lg font-semibold">Plus de profils</p>
            <p className="text-[#6B6258] text-sm mt-1">Reviens plus tard ou modifie tes filtres</p>
          </div>
        ) : (
          <TiltCard className="w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden shadow-lg shadow-black/40 bg-[#1C1C1E] sensual-border">
            <div className="relative w-full h-full">
              <Image src={current.photos?.[0] ?? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'} alt={current.name} fill className="object-cover pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

              <div className="absolute bottom-20 left-4 right-4 pointer-events-none">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-1">{current.name}{current.is_verified && <BadgeCheck size={20} className="text-blue-500" />}</h2>
                  {current.age && <span className="text-xl text-white/90">{current.age}</span>}
                </div>
                {current.location && <p className="text-white/80 text-sm">{current.location}</p>}
              </div>

              {current.interests && current.interests.length > 0 && (
                <div className="absolute bottom-32 left-4 flex gap-1.5 pointer-events-none">
                  {current.interests.slice(0, 3).map((i) => (
                    <span key={i} className="text-xs text-white bg-white/20 px-2.5 py-0.5 rounded-full">{i}</span>
                  ))}
                </div>
              )}
              {current.looking_for && (
                <div className="absolute bottom-24 left-4 pointer-events-none">
                  <span className="text-xs text-[#D92D4A] bg-[#D92D4A]/10 px-2 py-0.5 rounded-full">{lookingForLabel(current.looking_for)}</span>
                </div>
              )}
              <button onClick={async () => {
                if (!current) return
                if (confirm('Bloquer ce profil ?')) {
                  await blockProfile(current.id)
                  const swiped = await getSwipedIds()
                  const { data } = await getProfiles([...swiped, ...blockedIds, current.id], { minAge: 18, maxAge: 99, lookingFor: filters.lookingFor || undefined })
                  if (data) setProfiles(data)
                  setIdx(0)
                }
              }}
                className="absolute top-2 right-2 p-2 bg-black/40 rounded-full z-10">
                <Shield size={16} className="text-[#6B6258]" />
              </button>
            </div>

            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-5">
              <button onClick={() => swipe('pass')} className="w-14 h-14 rounded-full bg-[#1C1C1E] shadow-lg shadow-black/30 flex items-center justify-center">
                <X size={28} className="text-red-500" />
              </button>
              <button onClick={() => swipe('super_like')} className="w-11 h-11 rounded-full bg-[#1C1C1E] shadow-lg shadow-black/30 flex items-center justify-center">
                <Star size={22} className="text-indigo-500" />
              </button>
              <button onClick={async () => {
                if (!current || flirtedIds.includes(current.id)) return
                await sendFlirt(current.id)
                setFlirtedIds(ids => [...ids, current.id])
              }}
                className="w-11 h-11 rounded-full bg-[#1C1C1E] shadow-lg shadow-black/30 flex items-center justify-center">
                <Eye size={22} className={flirtedIds.includes(current?.id ?? '') ? 'text-[#D92D4A]' : 'text-[#6B6258]'} />
              </button>
              <button onClick={() => swipe('like')} className="w-14 h-14 rounded-full bg-[#1C1C1E] shadow-lg shadow-black/30 flex items-center justify-center">
                <Heart size={28} className="text-green-500" />
              </button>
            </div>
          </TiltCard>
        )}
      </div>

      {matchModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
          <MatchBurst />
          <div className="bg-[#1C1C1E] rounded-3xl p-8 max-w-sm w-full text-center animate-bounce-in relative z-10">
            <Heart size={72} className="mx-auto mb-4" style={{ color: '#D92D4A' }} fill="#D92D4A" />
            <h2 className="text-3xl font-bold" style={{ color: '#D92D4A' }}>C&rsquo;est un match !</h2>
            <p className="text-[#9E9488] mt-1">Vous vous êtes mutuellement likés</p>
            <div className="flex items-center justify-center gap-4 my-6">
              <Image src="https://images.unsplash.com/photo-1494790108377-be9c29b29330" alt="Vous" width={80} height={80} className="rounded-full border-2 border-[#D92D4A] object-cover" />
              <Heart size={24} className="text-[#D92D4A]" fill="#D92D4A" />
              <Image src={matchModal.profile.photos?.[0] ?? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d'} alt={matchModal.profile.name} width={80} height={80} className="rounded-full border-2 border-[#D92D4A] object-cover" />
            </div>
            <p className="font-semibold mb-6">{matchModal.profile.name}</p>
            <button onClick={() => { router.push(`/chat/${matchModal.matchId}`); setMatchModal(null) }}
              className="w-full py-3.5 rounded-full text-white font-semibold" style={{ background: '#D92D4A' }}>
              Envoyer un message
            </button>
            <button onClick={() => setMatchModal(null)} className="w-full py-3 mt-2 text-[#9E9488] text-sm">Continuer à swiper</button>
          </div>
        </div>
      )}
    </div>
  )
}
