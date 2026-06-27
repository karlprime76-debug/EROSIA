'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { MessageCircle, X, Heart, Star, Globe, SlidersHorizontal, Eye, Shield, BadgeCheck, RotateCcw, Flag } from 'lucide-react'
import { getProfilesPaginated, getSwipedIds, createSwipe, checkForMatch, sendFlirt, getSentFlirtIds, blockProfile, getBlockedIds, deleteLastSwipe, getLastSwipe, getProfilesNearby, updateLocation, getSuperLikesRemaining, useSuperLike as consumeSuperLike, reportProfile, getCompatibilityBatch, getActiveStories, getDailySwipeCount, checkPremium, searchProfilesByCity, undoSuperLike, type Profile } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'
import { supabase } from '@/lib/supabase/client'
import { TiltCard } from '@/components/3d/TiltCard'
import { MatchBurst } from '@/components/3d/MatchBurst'
import { DiscoverSkeleton } from '@/components/Skeleton'

const SUPER_LIKE_DAILY = 1
const DISCOVER_PAGE_SIZE = 20

const REPORT_REASONS = ['Compte faux', 'Harcèlement', 'Spam', 'Contenu inapproprié', 'Autre'] as const

const lookingForLabel = (v: string) => ({ friendship: 'Amitié', casual: 'Plan cul', fwb: 'FWB', serious: 'Sérieux', open: 'Libre' }[v] ?? v)

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [matchModal, setMatchModal] = useState<{ profile: Profile; matchId: string } | null>(null)
  const [superLikesLeft, setSuperLikesLeft] = useState(SUPER_LIKE_DAILY)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ minAge: 18, maxAge: 99, lookingFor: '', city: '' })
  const [flirtedIds, setFlirtedIds] = useState<string[]>([])
  const [hasSwiped, setHasSwiped] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [distanceKm, setDistanceKm] = useState<number | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [swipeAnim, setSwipeAnim] = useState<'idle' | 'left' | 'right'>('idle')
  const [heartBurst, setHeartBurst] = useState(false)
  const [compatScores, setCompatScores] = useState<Record<string, number>>({})
  const [storiesUserIds, setStoriesUserIds] = useState<Set<string>>(new Set())
  const [swipeCount, setSwipeCount] = useState(0)
  const [swipeLimit, setSwipeLimit] = useState(20)
  const [isPremium, setIsPremium] = useState(false)
  const [myPhoto, setMyPhoto] = useState('')
  const [myId, setMyId] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const { confirm } = useConfirm()

  useEffect(() => {
    getSuperLikesRemaining().then(r => setSuperLikesLeft(r ?? SUPER_LIKE_DAILY))
    getDailySwipeCount().then(({ count, limit }) => { setSwipeCount(count); setSwipeLimit(limit) })
    checkPremium().then(setIsPremium)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setMyId(user.id)
        supabase.from('profiles').select('photos').eq('id', user.id).single().then(({ data }) => {
          if (data?.photos?.[0]) setMyPhoto(data.photos[0])
        })
      }
    })
  }, [])

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        updateLocation(pos.coords.latitude, pos.coords.longitude)
      },
      () => {}
    )
  }, [])

  useEffect(() => {
    Promise.all([getSwipedIds(), getBlockedIds(), getLastSwipe()])
      .then(async ([swiped, blocked, last]) => {
        setHasSwiped(!!last)
        const exclude = [...swiped, ...blocked, myId].filter(Boolean)
        const { data } = await getProfilesPaginated(exclude, 1, { minAge: 18, maxAge: 99 })
        if (data) {
          setProfiles(data)
          setHasMore(data.length >= DISCOVER_PAGE_SIZE)
        }
        setLoading(false)
      })
    getSentFlirtIds().then(ids => setFlirtedIds(ids)).catch(() => {})
  }, [myId])

  useEffect(() => {
    getActiveStories().then(({ data }) => {
      if (data) setStoriesUserIds(new Set(data.map((s: { user_id: string }) => s.user_id)))
    }).catch(() => {})
  }, [])

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragStart(e.clientX)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStart === null) return
    setDragX(e.clientX - dragStart)
  }

  const handlePointerUp = () => {
    if (dragStart === null) return
    if (dragX > 80) swipe('like')
    else if (dragX < -80) swipe('pass')
    setDragX(0)
    setDragStart(null)
  }

  const haptic = (ms = 10) => { try { navigator.vibrate(ms) } catch {} }

  useEffect(() => {
    if (!profiles.length) return
    let cancelled = false
    const load = async () => {
      const scores = await getCompatibilityBatch(profiles.map(p => p.id))
      if (cancelled) return
      setCompatScores(scores)
      if (Object.keys(scores).length) {
        const sorted = [...profiles].sort((a, b) => {
          const sa = scores[a.id] ?? 0
          const sb = scores[b.id] ?? 0
          if (sa !== sb) return sb - sa
          return Math.random() - 0.5
        })
        setProfiles(sorted)
      }
    }
    load()
    return () => { cancelled = true }
  }, [profiles.length])

  const fetchProfiles = async (extraBlocked: string[] = [], pageNum = 1) => {
    const swiped = await getSwipedIds()
    const blocked = await getBlockedIds()
    const exclude = [...swiped, ...blocked, ...extraBlocked]
    const opts = { ...filters, lookingFor: filters.lookingFor || undefined }
    let result
    if (filters.city.trim()) {
      result = await searchProfilesByCity(filters.city.trim(), exclude, opts)
    } else if (distanceKm !== null && lat !== null && lng !== null) {
      result = await getProfilesNearby(lat, lng, distanceKm, exclude, opts)
    } else {
      result = await getProfilesPaginated(exclude, pageNum, { ...opts, minAge: filters.minAge, maxAge: filters.maxAge })
    }
    if (result.data && Object.keys(compatScores).length) {
      result.data.sort((a, b) => {
        const sa = compatScores[a.id] ?? 0
        const sb = compatScores[b.id] ?? 0
        if (sa !== sb) return sb - sa
        return Math.random() - 0.5
      })
    }
    return result
  }

  const swipe = async (dir: 'like' | 'pass' | 'super_like') => {
    const p = profiles[idx]
    if (!p) return
    if (!isPremium && swipeCount >= swipeLimit) {
      toast('Tu as atteint ta limite de swipe du jour. Passe à Premium pour swiper sans limite !', 'warning')
      router.push('/settings')
      return
    }
    if (dir === 'super_like') {
      if (superLikesLeft <= 0) return
      const result = await consumeSuperLike()
      if (result?.error) {
        toast("Plus de super like aujourd'hui", 'error')
        return
      }
      setSuperLikesLeft((s) => s - 1)
    }

    haptic(dir === 'like' ? 12 : 6)

    // Optimistic — advance immediately
    const next = idx + 1
    if (next >= profiles.length) {
      setProfiles([])
      setIdx(0)
    } else {
      setIdx(next)
    }
    setSwipeAnim(dir === 'like' ? 'right' : 'left')

    // Background API calls
    if (dir === 'like') { setHeartBurst(true); setTimeout(() => setHeartBurst(false), 600) }
    setTimeout(async () => {
      setSwipeAnim('idle')
      await createSwipe(p.id, dir).catch(() => { toast('Erreur lors du swipe', 'error') })
      setHasSwiped(true)
      if (dir === 'like' || dir === 'super_like') {
        const { isMatch, match } = await checkForMatch(p.id).catch(() => ({ isMatch: false, match: null }))
        if (isMatch && match) setMatchModal({ profile: p, matchId: match.id })
      }
      if (next >= profiles.length) {
        if (!hasMore) return
        const nextPage = page + 1
        setPage(nextPage)
        const { data } = await fetchProfiles([], nextPage)
        if (data) {
          setProfiles(prev => [...prev, ...data])
          setHasMore(data.length >= DISCOVER_PAGE_SIZE)
        }
      }
    }, 0)
  }

  const handleRewind = async () => {
    const last = await getLastSwipe()
    if (!last) { setHasSwiped(false); return }
    await deleteLastSwipe()
    const { data } = await fetchProfiles()
    if (data) setProfiles(data)
    setIdx(0)
    const swiped = await getSwipedIds()
    setHasSwiped(swiped.length > 0)
  }

  const current = profiles[idx]

  // Keyboard arrows + Escape for modals
  useEffect(() => {
    const f = swipe
    const c = current
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && c) { e.preventDefault(); f('pass') }
      if (e.key === 'ArrowRight' && c) { e.preventDefault(); f('like') }
      if (e.key === 'ArrowUp' && c) { e.preventDefault(); f('super_like') }
      if (e.key === 'Escape') { setShowReportModal(false); setMatchModal(null) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  if (loading) return <DiscoverSkeleton />

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center justify-between px-5 pt-6 pb-3">
        <Link href="/discover"><Image src="/logo.png" alt="Erosia" width={110} height={36} className="drop-shadow-[0_0_10px_rgba(217,45,74,0.2)]" /></Link>
        <div className="flex items-center gap-2">
          {!isPremium && (
            <span className="text-[10px] text-[#6B6258] bg-[#1C1C1E] px-2 py-1 rounded-full border border-[#2A2826]">
              {swipeLimit - swipeCount} swipes
            </span>
          )}
          {hasSwiped && <button onClick={handleRewind} aria-label="Revoir" className="w-10 h-10 rounded-full glass-light flex items-center justify-center transition-all hover:border-white/20 active:scale-90"><RotateCcw size={18} className="text-[#9E9488]" /></button>}
          <button onClick={async () => { const r = await undoSuperLike(); if (r.error) toast(r.error, 'error'); else { setSuperLikesLeft(s => s + 1); toast('Super like annulé', 'success') } }} aria-label="Annuler super like" className="w-10 h-10 rounded-full glass-light flex items-center justify-center transition-all hover:border-indigo-500/30 active:scale-90"><Star size={16} className="text-indigo-400" /></button>
          <button onClick={() => setShowFilters(!showFilters)} aria-label="Filtres" className="w-10 h-10 rounded-full glass-light flex items-center justify-center transition-all hover:border-white/20 active:scale-90"><SlidersHorizontal size={18} className="text-[#9E9488]" /></button>
          <button onClick={() => router.push('/matches')} aria-label="Matchs" className="w-10 h-10 rounded-full glass-light flex items-center justify-center transition-all hover:border-white/20 active:scale-90"><MessageCircle size={18} className="text-[#9E9488]" /></button>
        </div>
      </header>

      {showFilters && (
        <div className="mx-4 mb-3 p-4 glass-card rounded-2xl space-y-3 text-sm animate-scale-in">
          <div>
            <label className="text-xs font-medium text-[#9E9488] mb-1 block">Âge : {filters.minAge} – {filters.maxAge} ans</label>
            <div className="flex gap-3 items-center">
              <input type="range" min={18} max={70} value={filters.minAge}
                onChange={e => setFilters(f => ({ ...f, minAge: Math.min(Number(e.target.value), f.maxAge) }))}
                className="flex-1 accent-[#D92D4A]" />
              <span className="text-[#5A5248]">–</span>
              <input type="range" min={18} max={70} value={filters.maxAge}
                onChange={e => setFilters(f => ({ ...f, maxAge: Math.max(Number(e.target.value), f.minAge) }))}
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
          <div>
            <label className="text-xs font-medium text-[#9E9488] mb-1 block">Distance</label>
            <select value={distanceKm ?? ''} onChange={e => setDistanceKm(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-[#1C1C1E] text-[#F5F0EB] border border-[#2A2826] rounded-lg px-3 py-2 text-sm">
              <option value="">Tout</option>
              <option value="10">10 km</option>
              <option value="25">25 km</option>
              <option value="50">50 km</option>
              <option value="100">100 km</option>
            </select>
          </div>
          <div>
            <label htmlFor="filter-city" className="text-xs font-medium text-[#9E9488] mb-1 block">Ville</label>
            <input id="filter-city" value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))} placeholder="Nom de ville"
              className="w-full bg-[#1C1C1E] text-[#F5F0EB] border border-[#2A2826] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#D92D4A] transition-colors" />
          </div>
          <button onClick={async () => {
            setShowFilters(false); setLoading(true); setPage(1); setHasMore(true)
            const { data } = await fetchProfiles([], 1)
            if (data) {
              setProfiles(data)
              setHasMore(data.length >= DISCOVER_PAGE_SIZE)
            }
            setLoading(false)
          }}
            className="w-full py-3 rounded-full text-white font-semibold text-sm transition-all active:scale-95 hover:shadow-[0_0_20px_rgba(217,45,74,0.3)]" style={{ background: '#D92D4A' }}>
            Appliquer les filtres
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-2">
        {!current ? (
          <div className="text-center animate-fade-up">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D92D4A]/10 to-transparent mx-auto mb-5 flex items-center justify-center border border-[#D92D4A]/10">
              <Globe size={36} className="text-[#D92D4A]/40" />
            </div>
            <p className="text-xl font-semibold">Plus de profils</p>
            <p className="text-[#6B6258] text-sm mt-1 max-w-xs mx-auto leading-relaxed">Reviens plus tard ou modifie tes filtres</p>
          </div>
        ) : (
          <div className="touch-none select-none w-full max-w-sm"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={dragStart !== null ? { transform: `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`, transition: 'none' } : undefined}>
          <TiltCard className={`w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden shadow-xl shadow-black/50 bg-[#1C1C1E] sensual-border animate-scale-in transition-all duration-300 ${
            swipeAnim === 'left' ? 'opacity-0 -translate-x-48 rotate-12 scale-90' : swipeAnim === 'right' ? 'opacity-0 translate-x-48 -rotate-12 scale-90' : ''
          }`}>
            <div className="relative w-full h-full">
              {heartBurst && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <Heart size={80} className="text-white animate-heart-burst" fill="white" />
                </div>
              )}
              <Image src={current.photos?.[0] ?? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'} alt={current.name} fill className="object-cover pointer-events-none" />
              {storiesUserIds.has(current.id) && (
                <div className="absolute top-3 left-3 w-10 h-10 rounded-full ring-2 ring-[#D92D4A] ring-offset-2 ring-offset-[#0A0A0A] z-10" />
              )}
              {compatScores[current.id] !== undefined && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold shadow-lg"
                  style={{ background: compatScores[current.id] >= 70 ? '#22C55E' : compatScores[current.id] >= 40 ? '#EAB308' : '#EF4444' }}>
                  {compatScores[current.id]}%
                </div>
              )}
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
                if (await confirm('Bloquer ce profil ?')) {
                  await blockProfile(current.id)
                  const { data } = await fetchProfiles([current.id])
                  if (data) setProfiles(data)
                  setIdx(0)
                }
              }} aria-label="Bloquer"
                className="absolute top-2 right-2 p-2 bg-black/40 rounded-full z-10">
                <Shield size={16} className="text-[#6B6258]" />
              </button>
            </div>

            <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-4">
              <button onClick={() => swipe('pass')} aria-label="Passer" className="w-14 h-14 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 shadow-lg shadow-black/40 flex items-center justify-center transition-all active:scale-90 hover:border-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                <X size={26} className="text-red-400" />
              </button>
              <div className="relative">
                <button onClick={() => swipe('super_like')} aria-label="Super like" className="w-12 h-12 rounded-full bg-zinc-900/80 backdrop-blur-md border border-indigo-600/30 shadow-lg shadow-black/40 flex items-center justify-center transition-all active:scale-90 hover:border-indigo-500/50">
                  <Star size={22} className="text-indigo-400" />
                </button>
                <span className="absolute -top-1.5 -right-1.5 text-[10px] font-bold text-indigo-400 bg-zinc-900 rounded-full px-1.5 border border-indigo-500/40">
                  {superLikesLeft}/{SUPER_LIKE_DAILY}
                </span>
              </div>
              <button onClick={async () => {
                if (!current || flirtedIds.includes(current.id)) return
                await sendFlirt(current.id)
                setFlirtedIds(ids => [...ids, current.id])
              }} aria-label="Clin d'oeil"
                className="w-12 h-12 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 shadow-lg shadow-black/40 flex items-center justify-center transition-all active:scale-90 hover:border-[#D92D4A]/30">
                <Eye size={20} className={flirtedIds.includes(current?.id ?? '') ? 'text-[#D92D4A]' : 'text-[#6B6258]'} />
              </button>
              <button onClick={() => swipe('like')} aria-label="Like" className="w-14 h-14 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 shadow-lg shadow-black/40 flex items-center justify-center transition-all active:scale-90 hover:border-green-500/30 hover:shadow-[0_0_15px_rgba(34,197,94,0.15)]">
                <Heart size={26} className="text-green-400" />
              </button>
              <button onClick={() => setShowReportModal(true)} aria-label="Signaler" className="w-12 h-12 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-700/50 shadow-lg shadow-black/40 flex items-center justify-center transition-all active:scale-90 hover:border-zinc-500/50">
                <Flag size={18} className="text-[#6B6258]" />
              </button>
            </div>
          </TiltCard>
          </div>
        )}
      </div>

      {showReportModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 backdrop-blur-sm" onClick={() => setShowReportModal(false)}>
          <div className="glass-card rounded-3xl p-8 max-w-sm w-full text-center animate-scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-2">Signaler ce profil</h2>
            <p className="text-[#9E9488] text-sm mb-5">Pour quelle raison ?</p>
            <div className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <button key={reason} onClick={async () => {
                  if (!current) return
                  const { error } = await reportProfile(current.id, reason)
                  setShowReportModal(false)
                  if (error) {
                    toast('Erreur lors du signalement', 'error')
                  } else {
                    toast('Signalement envoyé', 'success')
                  }
                }}
                  className="w-full py-3 rounded-lg text-sm font-medium bg-white/5 text-[#F5F0EB] hover:bg-white/10 transition-all border border-white/5">
                  {reason}
                </button>
              ))}
            </div>
            <button onClick={() => setShowReportModal(false)} className="w-full py-3 mt-3 text-[#9E9488] text-sm hover:text-white transition">
              Annuler
            </button>
          </div>
        </div>
      )}

      {matchModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 backdrop-blur-sm" onClick={() => setMatchModal(null)}>
          <MatchBurst />
          <div className="glass-card rounded-3xl p-8 max-w-sm w-full text-center animate-scale-in relative z-10">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D92D4A] to-[#A8102A] mx-auto mb-5 flex items-center justify-center shadow-[0_0_30px_rgba(217,45,74,0.3)]">
              <Heart size={40} className="text-white" fill="white" />
            </div>
            <h2 className="text-3xl font-bold" style={{ color: '#D92D4A' }}>C&rsquo;est un match !</h2>
            <p className="text-[#9E9488] mt-1">Vous vous êtes mutuellement likés</p>
            <div className="flex items-center justify-center gap-4 my-6">
              {myPhoto ? <Image src={myPhoto} alt="Vous" width={80} height={80} className="rounded-full border-2 border-[#D92D4A] object-cover ring-2 ring-[#D92D4A]/20" />
                : <div className="w-20 h-20 rounded-full bg-[#262628] flex items-center justify-center text-[#6B6258] text-2xl">?</div>}
              <Heart size={24} className="text-[#D92D4A]/60" fill="#D92D4A" />
              <Image src={matchModal.profile.photos?.[0] ?? ''} alt={matchModal.profile.name} width={80} height={80} className="rounded-full border-2 border-[#D92D4A] object-cover ring-2 ring-[#D92D4A]/20" />
            </div>
            <p className="font-semibold mb-6">{matchModal.profile.name}</p>
            <button onClick={() => { router.push(`/chat/${matchModal.matchId}`); setMatchModal(null) }}
              className="w-full py-3.5 rounded-full text-white font-semibold transition-all active:scale-95 hover:shadow-[0_0_25px_rgba(217,45,74,0.4)]" style={{ background: '#D92D4A' }}>
              Envoyer un message
            </button>
            <button onClick={() => setMatchModal(null)} className="w-full py-3 mt-2 text-[#9E9488] text-sm hover:text-white transition">Continuer à swiper</button>
          </div>
        </div>
      )}
    </div>
  )
}
