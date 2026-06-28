'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'motion/react'
import { MessageCircle, X, Heart, Star, Globe, SlidersHorizontal, Eye, Shield, BadgeCheck, RotateCcw, Flag } from 'lucide-react'
import { getProfilesPaginated, getSwipedIds, createSwipe, checkForMatch, sendFlirt, getSentFlirtIds, blockProfile, getBlockedIds, deleteLastSwipe, getLastSwipe, getProfilesNearby, updateLocation, getSuperLikesRemaining, useSuperLike as consumeSuperLike, reportProfile, getCompatibilityBatch, getActiveStories, getDailySwipeCount, checkPremium, searchProfilesByCity, undoSuperLike, logBehavior, type Profile } from '@/lib/api'
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

const tabVariants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.95 },
}

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
  const profilesRef = useRef(profiles)
  useEffect(() => { profilesRef.current = profiles }, [profiles])
  const router = useRouter()
  const { toast } = useToast()
  const { confirm } = useConfirm()

  useEffect(() => {
    getSuperLikesRemaining().then(r => setSuperLikesLeft(r ?? SUPER_LIKE_DAILY)).catch(console.error)
    getDailySwipeCount().then(({ count, limit }) => { setSwipeCount(count); setSwipeLimit(limit) }).catch(console.error)
    checkPremium().then(setIsPremium).catch(console.error)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setMyId(user.id)
        supabase.from('profiles').select('photos').eq('id', user.id).maybeSingle().then(({ data }) => {
          if (data?.photos?.[0]) setMyPhoto(data.photos[0])
        }, console.error)
      }
    }).catch(console.error)
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
      }).catch(console.error)
    getSentFlirtIds().then(ids => setFlirtedIds(ids)).catch(() => { toast('Erreur chargement flirts', 'error') })
  }, [myId, toast])

  useEffect(() => {
    getActiveStories().then(({ data }) => {
      if (data) setStoriesUserIds(new Set(data.map((s: { user_id: string }) => s.user_id)))
    }).catch(() => { toast('Erreur chargement stories', 'error') })
  }, [toast])

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
    const current = profilesRef.current
    if (!current.length) return
    let cancelled = false
    const load = async () => {
      const scores = await getCompatibilityBatch(current.map(p => p.id))
      if (cancelled) return
      setCompatScores(scores)
      if (Object.keys(scores).length) {
        const sorted = [...current].sort((a, b) => {
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
    logBehavior(dir === 'super_like' ? 'swipe_super_like' : dir === 'like' ? 'swipe_like' : 'swipe_pass', p.id)

    const next = idx + 1
    if (next >= profiles.length) {
      setProfiles([])
      setIdx(0)
    } else {
      setIdx(next)
    }
    setSwipeAnim(dir === 'like' ? 'right' : 'left')

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
  useEffect(() => { if (current) logBehavior('view_profile', current.id) }, [current])

  const swipeRef = useRef(swipe)
  useEffect(() => { swipeRef.current = swipe })

  useEffect(() => {
    const c = current
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && c) { e.preventDefault(); swipeRef.current('pass') }
      if (e.key === 'ArrowRight' && c) { e.preventDefault(); swipeRef.current('like') }
      if (e.key === 'ArrowUp' && c) { e.preventDefault(); swipeRef.current('super_like') }
      if (e.key === 'Escape') { setShowReportModal(false); setMatchModal(null) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [current])

  if (loading) return <DiscoverSkeleton />

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center justify-between px-5 pt-6 pb-3">
        <Link href="/discover">
          <Image src="/logo.png" alt="Erosia" width={110} height={36} className="drop-shadow-[0_0_10px_rgba(217,45,74,0.2)]" />
        </Link>
        <div className="flex items-center gap-2">
          {!isPremium && (
            <span className="text-[10px] text-[#A09890] bg-[#18181A] px-2.5 py-1 rounded-full border border-[#2C2A28]">
              {swipeLimit - swipeCount} swipes
            </span>
          )}
          {hasSwiped && (
            <button type="button" onClick={handleRewind} aria-label="Revoir"
              className="w-10 h-10 rounded-full glass-light flex items-center justify-center transition-all duration-200 hover:border-white/20 active:scale-90">
              <RotateCcw size={16} className="text-[#A09890]" />
            </button>
          )}
          <button type="button" onClick={() => { (async () => { const r = await undoSuperLike(); if (r.error) toast(r.error, 'error'); else { setSuperLikesLeft(s => s + 1); toast('Super like annulé', 'success') } })().catch(console.error) }}
            aria-label="Annuler super like"
            className="w-10 h-10 rounded-full glass-light flex items-center justify-center transition-all duration-200 hover:border-indigo-500/30 active:scale-90">
            <Star size={14} className="text-indigo-400" />
          </button>
          <button type="button" onClick={() => setShowFilters(!showFilters)} aria-label="Filtres"
            className="w-10 h-10 rounded-full glass-light flex items-center justify-center transition-all duration-200 hover:border-white/20 active:scale-90">
            <SlidersHorizontal size={16} className="text-[#A09890]" />
          </button>
          <button type="button" onClick={() => router.push('/matches')} aria-label="Matchs"
            className="w-10 h-10 rounded-full glass-light flex items-center justify-center transition-all duration-200 hover:border-white/20 active:scale-90">
            <MessageCircle size={16} className="text-[#A09890]" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mb-3 p-5 glass rounded-2xl space-y-4 text-sm"
          >
            <div>
              <label className="text-xs font-medium text-[#A09890] mb-1.5 block">Âge : {filters.minAge} – {filters.maxAge} ans</label>
              <div className="flex gap-3 items-center">
                <input type="range" min={18} max={70} value={filters.minAge} aria-label="Âge minimum"
                  onChange={e => setFilters(f => ({ ...f, minAge: Math.min(Number(e.target.value), f.maxAge) }))}
                  className="flex-1 accent-[#D92D4A]" />
                <span className="text-[#6B6560]">–</span>
                <input type="range" min={18} max={70} value={filters.maxAge} aria-label="Âge maximum"
                  onChange={e => setFilters(f => ({ ...f, maxAge: Math.max(Number(e.target.value), f.minAge) }))}
                  className="flex-1 accent-[#D92D4A]" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#A09890] mb-1.5 block">Type de relation</label>
              <select value={filters.lookingFor} onChange={e => setFilters(f => ({ ...f, lookingFor: e.target.value }))}
                className="w-full bg-[#18181A] text-[#F5F0EB] border border-[#2C2A28] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#D92D4A]">
                <option value="">Tout</option>
                <option value="friendship">Amitié</option>
                <option value="casual">Plan cul</option>
                <option value="fwb">Friends with benefits</option>
                <option value="serious">Relation sérieuse</option>
                <option value="open">Relation libre</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#A09890] mb-1.5 block">Distance</label>
              <select value={distanceKm ?? ''} onChange={e => setDistanceKm(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-[#18181A] text-[#F5F0EB] border border-[#2C2A28] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#D92D4A]">
                <option value="">Tout</option>
                <option value="10">10 km</option>
                <option value="25">25 km</option>
                <option value="50">50 km</option>
                <option value="100">100 km</option>
              </select>
            </div>
            <div>
              <label htmlFor="filter-city" className="text-xs font-medium text-[#A09890] mb-1.5 block">Ville</label>
              <input id="filter-city" value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))} placeholder="Nom de ville"
                className="w-full bg-[#18181A] text-[#F5F0EB] border border-[#2C2A28] rounded-xl px-3 py-2.5 text-sm outline-none transition-all duration-200 focus:border-[#D92D4A] focus:shadow-[0_0_0_3px_rgba(217,45,74,0.12)]" />
            </div>
            <button type="button" onClick={() => { (async () => {
              setShowFilters(false); setLoading(true); setPage(1); setHasMore(true)
              const { data } = await fetchProfiles([], 1)
              if (data) { setProfiles(data); setHasMore(data.length >= DISCOVER_PAGE_SIZE) }
              setLoading(false)
            })().catch(console.error) }}
              className="w-full py-3 rounded-full text-white font-semibold text-sm transition-all duration-300 active:scale-[0.97] bg-[#D92D4A] shadow-[0_4px_16px_rgba(217,45,74,0.2)] hover:shadow-[0_6px_24px_rgba(217,45,74,0.35)]">
              Appliquer les filtres
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-2">
        <AnimatePresence mode="wait">
          {!current ? (
            <motion.div
              key="empty"
              variants={tabVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-center"
            >
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#D92D4A]/10 to-transparent mx-auto mb-6 flex items-center justify-center border border-[#D92D4A]/10">
                <Globe size={40} className="text-[#D92D4A]/30" />
              </div>
              <p className="text-xl font-bold text-[#F5F0EB]">Plus de profils</p>
              <p className="text-[#6B6560] text-sm mt-1 max-w-xs mx-auto leading-relaxed">Reviens plus tard ou modifie tes filtres</p>
            </motion.div>
          ) : (
            <motion.div
              key={current.id}
              variants={tabVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="touch-none select-none w-full max-w-sm"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              style={dragStart !== null ? { transform: `translateX(${dragX}px) rotate(${dragX * 0.05}deg)`, transition: 'none' } : undefined}
            >
              <TiltCard className={`w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden shadow-[0_16px_64px_rgba(0,0,0,0.5)] bg-[#18181A] border border-[rgba(255,255,255,0.06)] transition-all duration-300 ${
                swipeAnim === 'left' ? 'opacity-0 -translate-x-48 rotate-12 scale-90' : swipeAnim === 'right' ? 'opacity-0 translate-x-48 -rotate-12 scale-90' : ''
              }`}>
                <div className="relative w-full h-full">
                  {heartBurst && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                      <motion.div
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1.3, rotate: 5, opacity: 0 }}
                        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                      >
                        <Heart size={80} className="text-white" fill="white" />
                      </motion.div>
                    </div>
                  )}
                  <Image src={current.photos?.[0] ?? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'} alt={current.name} fill className="object-cover pointer-events-none" />
                  {storiesUserIds.has(current.id) && (
                    <div className="absolute top-4 left-4 w-11 h-11 rounded-full ring-2 ring-[#D92D4A] ring-offset-2 ring-offset-[#070708] z-10 shadow-[0_0_12px_rgba(217,45,74,0.3)]" />
                  )}
                  {compatScores[current.id] !== undefined && (
                    <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-md"
                      style={{ background: compatScores[current.id] >= 70 ? '#34D399' : compatScores[current.id] >= 40 ? '#FBBF24' : '#F87171' }}>
                      {compatScores[current.id]}%
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

                  <div className="absolute bottom-24 left-5 right-5 pointer-events-none">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-2xl font-bold text-white flex items-center gap-1.5">{current.name}{current.is_verified && <BadgeCheck size={18} className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />}</h2>
                      {current.age && <span className="text-xl text-white/80">{current.age}</span>}
                    </div>
                    {current.location && <p className="text-white/70 text-sm mt-0.5">{current.location}</p>}
                  </div>

                  {current.interests && current.interests.length > 0 && (
                    <div className="absolute bottom-[7.5rem] left-5 flex gap-1.5 pointer-events-none">
                      {current.interests.slice(0, 3).map((i) => (
                        <span key={i} className="text-[11px] text-white bg-white/15 backdrop-blur-md px-2.5 py-0.5 rounded-full">{i}</span>
                      ))}
                    </div>
                  )}
                  {current.looking_for && (
                    <div className="absolute bottom-[6rem] left-5 pointer-events-none">
                      <span className="text-[11px] text-[#D92D4A] bg-[#D92D4A]/15 backdrop-blur-md px-2.5 py-0.5 rounded-full">{lookingForLabel(current.looking_for)}</span>
                    </div>
                  )}
                  <button type="button" onClick={() => { (async () => {
                    if (!current) return
                    if (await confirm('Bloquer ce profil ?')) {
                      await blockProfile(current.id)
                      const { data } = await fetchProfiles([current.id])
                      if (data) setProfiles(data)
                      setIdx(0)
                    }
                  })().catch(console.error) }} aria-label="Bloquer"
                    className="absolute top-4 right-4 p-2.5 bg-black/40 backdrop-blur-md rounded-full z-10 hover:bg-black/60 transition-all duration-200">
                    <Shield size={15} className="text-[#6B6560]" />
                  </button>
                </div>

                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3">
                  <button type="button" onClick={() => swipe('pass')} aria-label="Passer"
                    className="w-14 h-14 rounded-full bg-[rgba(15,15,17,0.8)] backdrop-blur-md border border-[rgba(255,255,255,0.06)] shadow-lg flex items-center justify-center transition-all duration-200 active:scale-90 hover:border-red-500/30 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                    <X size={24} className="text-[#F87171]" />
                  </button>
                  <div className="relative">
                    <button type="button" onClick={() => swipe('super_like')} aria-label="Super like"
                      className="w-12 h-12 rounded-full bg-[rgba(15,15,17,0.8)] backdrop-blur-md border border-indigo-600/30 shadow-lg flex items-center justify-center transition-all duration-200 active:scale-90 hover:border-indigo-500/50">
                      <Star size={20} className="text-indigo-400" />
                    </button>
                    <span className="absolute -top-1.5 -right-1.5 text-[10px] font-bold text-indigo-400 bg-[#0F0F11] rounded-full px-1.5 border border-indigo-500/40">
                      {superLikesLeft}/{SUPER_LIKE_DAILY}
                    </span>
                  </div>
                  <button type="button" onClick={() => { (async () => {
                    if (!current || flirtedIds.includes(current.id)) return
                    await sendFlirt(current.id)
                    logBehavior('send_flirt', current.id)
                    setFlirtedIds(ids => [...ids, current.id])
                  })().catch(console.error) }} aria-label="Clin d'oeil"
                    className="w-11 h-11 rounded-full bg-[rgba(15,15,17,0.8)] backdrop-blur-md border border-[rgba(255,255,255,0.06)] shadow-lg flex items-center justify-center transition-all duration-200 active:scale-90 hover:border-[#D92D4A]/30">
                    <Eye size={18} className={flirtedIds.includes(current?.id ?? '') ? 'text-[#D92D4A]' : 'text-[#6B6560]'} />
                  </button>
                  <button type="button" onClick={() => swipe('like')} aria-label="Like"
                    className="w-14 h-14 rounded-full bg-[rgba(15,15,17,0.8)] backdrop-blur-md border border-[rgba(255,255,255,0.06)] shadow-lg flex items-center justify-center transition-all duration-200 active:scale-90 hover:border-[#34D399]/30 hover:shadow-[0_0_20px_rgba(52,211,153,0.1)]">
                    <Heart size={24} className="text-[#34D399]" />
                  </button>
                  <button type="button" onClick={() => setShowReportModal(true)} aria-label="Signaler"
                    className="w-11 h-11 rounded-full bg-[rgba(15,15,17,0.8)] backdrop-blur-md border border-[rgba(255,255,255,0.06)] shadow-lg flex items-center justify-center transition-all duration-200 active:scale-90 hover:border-zinc-500/50">
                    <Flag size={16} className="text-[#6B6560]" />
                  </button>
                </div>
              </TiltCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden="true" role="presentation" className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 backdrop-blur-sm"
            onClick={() => setShowReportModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              role="dialog" aria-modal="true" tabIndex={-1}
              className="glass rounded-3xl p-8 max-w-sm w-full text-center"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-[#F5F0EB] mb-2">Signaler ce profil</h2>
              <p className="text-[#A09890] text-sm mb-5">Pour quelle raison ?</p>
              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <button type="button" key={reason} onClick={() => { (async () => {
                    if (!current) return
                    const { error } = await reportProfile(current.id, reason)
                    setShowReportModal(false)
                    if (error) { toast('Erreur lors du signalement', 'error') }
                    else { toast('Signalement envoyé', 'success') }
                  })().catch(console.error) }}
                    className="w-full py-3 rounded-xl text-sm font-medium bg-[#18181A] text-[#F5F0EB] hover:bg-[#222225] transition-all duration-200 border border-[#2C2A28]">
                    {reason}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setShowReportModal(false)}
                className="w-full py-3 mt-3 text-[#A09890] text-sm hover:text-[#F5F0EB] transition-colors duration-200">
                Annuler
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {matchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden="true" role="presentation" className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 backdrop-blur-sm"
            onClick={() => setMatchModal(null)}
          >
            <MatchBurst />
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              role="dialog" aria-modal="true" tabIndex={-1}
              className="glass rounded-3xl p-8 max-w-sm w-full text-center relative z-10"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#D92D4A] to-[#A8102A] mx-auto mb-5 flex items-center justify-center shadow-[0_0_40px_rgba(217,45,74,0.3)]">
                <Heart size={44} className="text-white" fill="white" />
              </div>
              <h2 className="text-3xl font-bold text-gradient-primary">C&rsquo;est un match !</h2>
              <p className="text-[#A09890] mt-1">Vous vous êtes mutuellement likés</p>
              <div className="flex items-center justify-center gap-4 my-6">
                {myPhoto
                  ? <Image src={myPhoto} alt="Vous" width={72} height={72} className="rounded-full border-2 border-[#D92D4A] object-cover ring-2 ring-[#D92D4A]/20" />
                  : <div className="w-[72px] h-[72px] rounded-full bg-[#18181A] flex items-center justify-center text-[#6B6560] text-2xl border border-[#2C2A28]">?</div>}
                <Heart size={24} className="text-[#D92D4A]/50" fill="#D92D4A" />
                <Image src={matchModal.profile.photos?.[0] ?? ''} alt={matchModal.profile.name} width={72} height={72} className="rounded-full border-2 border-[#D92D4A] object-cover ring-2 ring-[#D92D4A]/20" />
              </div>
              <p className="font-semibold text-[#F5F0EB] mb-6">{matchModal.profile.name}</p>
              <button type="button" onClick={() => { router.push(`/chat/${matchModal.matchId}`); setMatchModal(null) }}
                className="w-full py-3.5 rounded-full text-white font-semibold text-sm transition-all duration-300 active:scale-[0.97] bg-[#D92D4A] shadow-[0_4px_24px_rgba(217,45,74,0.25)] hover:shadow-[0_8px_32px_rgba(217,45,74,0.4)]">
                Envoyer un message
              </button>
              <button type="button" onClick={() => setMatchModal(null)}
                className="w-full py-3 mt-2 text-[#A09890] text-sm hover:text-[#F5F0EB] transition-colors duration-200">
                Continuer à swiper
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
