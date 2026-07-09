'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'motion/react'
import { MessageCircle, X, Heart, Star, Globe, SlidersHorizontal, Eye, Shield, BadgeCheck, RotateCcw, Flag } from 'lucide-react'
import { getProfilesPaginated, getSwipedIds, createSwipe, checkForMatch, sendFlirt, getSentFlirtIds, blockProfile, getBlockedIds, deleteLastSwipe, getLastSwipe, getProfilesNearby, updateLocation, getSuperLikesRemaining, useSuperLike as consumeSuperLike, reportProfile, getCompatibilityBatch, getDailySwipeCount, checkPremium, searchProfilesByCity, logBehavior, type Profile, type Gender } from '@/lib/api'
import { getPrivacySettings } from '@/lib/privacy'
import { getActiveStories } from '@/lib/stories'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ConfirmDialog'
import { supabase } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import { FocusTrap } from '@/components/FocusTrap'
import { DiscoverSkeleton } from '@/components/Skeleton'
import { MatchModal } from '@/components/MatchModal'

const TiltCard = dynamic(() => import('@/components/3d/TiltCard').then(m => ({ default: m.TiltCard })), { ssr: false })
import { logger } from '@/lib/logger'
import type { AuraState } from '@/lib/aura/types'

const SUPER_LIKE_DAILY = 1
const DISCOVER_PAGE_SIZE = 20

const REPORT_REASONS = ['Compte faux', 'Harcèlement', 'Spam', 'Contenu inapproprié', 'Autre'] as const
const logoStyle = { fontFamily: 'var(--font-display)' }
const passBtnStyle = {
  background: 'color-mix(in srgb, var(--bg) 75%, transparent)',
  backdropFilter: 'blur(20px)',
  borderColor: 'color-mix(in srgb, var(--error) 20%, transparent)',
  boxShadow: '0 4px 20px color-mix(in srgb, var(--bg) 40%, transparent)',
} as const
const likeBtnStyle = {
  background: 'color-mix(in srgb, var(--bg) 75%, transparent)',
  backdropFilter: 'blur(20px)',
  borderColor: 'color-mix(in srgb, var(--success) 20%, transparent)',
  boxShadow: '0 0 20px color-mix(in srgb, var(--success) 8%, transparent), 0 4px 20px color-mix(in srgb, var(--bg) 40%, transparent)',
} as const
const reportBtnStyle = {
  background: 'color-mix(in srgb, var(--bg) 75%, transparent)',
  backdropFilter: 'blur(20px)',
} as const

const lookingForLabel = (v: string) => ({ friendship: 'Amitié', casual: 'Plan cul', fwb: 'FWB', serious: 'Sérieux', open: 'Libre' }[v] ?? v)
const moodLabel = (v: string) => ({ discuter: '💬 Discuter', rencontre: '🔥 Rencontre', disponible_ce_soir: '🍷 Dispo ce soir', relation_serieuse: '💕 Sérieux', chill: '🎮 Chill', de_passage: '🌍 De passage' }[v] ?? v)

const MOOD_COMPAT: Record<string, string[]> = {
  discuter: ['discuter', 'chill', 'de_passage'],
  rencontre: ['rencontre', 'disponible_ce_soir', 'relation_serieuse'],
  disponible_ce_soir: ['disponible_ce_soir', 'rencontre', 'relation_serieuse'],
  relation_serieuse: ['relation_serieuse', 'rencontre', 'discuter'],
  chill: ['chill', 'discuter', 'de_passage'],
  de_passage: ['de_passage', 'discuter', 'chill'],
}

const LOOKING_FOR_COMPAT: Record<string, string[]> = {
  friendship: ['friendship', 'casual', 'open'],
  casual: ['casual', 'fwb', 'open'],
  fwb: ['fwb', 'casual', 'open'],
  serious: ['serious'],
  open: ['open', 'casual', 'fwb', 'friendship'],
}

function computeProfileScore(profile: Profile, myLookingFor: string, myMood: string, myLat: number | null, myLng: number | null): number {
  let score = 50

  // Quiz compat (0-30)
  if (profile.energy_score !== undefined && profile.energy_score !== null) {
    score += profile.energy_score * 0.15
  }

  // Trust score (0-15)
  if (profile.trust_score !== undefined && profile.trust_score !== null) {
    score += profile.trust_score * 0.10
  }

  // Looking-for match (0-20)
  if (profile.looking_for) {
    if (profile.looking_for === myLookingFor) {
      score += 20
    } else if (LOOKING_FOR_COMPAT[myLookingFor]?.includes(profile.looking_for)) {
      score += 12
    }
  }

  // Mood compatibility (0-15)
  if (profile.mood) {
    if (profile.mood === myMood) {
      score += 15
    } else if (MOOD_COMPAT[myMood]?.includes(profile.mood)) {
      score += 8
    }
  }

  // Activité récente (0-10)
  if (profile.last_seen) {
    const daysSince = (Date.now() - new Date(profile.last_seen).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince <= 1) score += 10
    else if (daysSince <= 3) score += 8
    else if (daysSince <= 7) score += 5
    else if (daysSince <= 14) score += 3
  }

  // Proximité géographique (0-10)
  if (myLat !== null && myLng !== null && profile.latitude !== undefined && profile.longitude !== undefined && profile.latitude !== null && profile.longitude !== null) {
    const R = 6371
    const dLat = (profile.latitude - myLat) * Math.PI / 180
    const dLng = (profile.longitude - myLng) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(myLat * Math.PI / 180) * Math.cos(profile.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    if (dist <= 5) score += 10
    else if (dist <= 15) score += 8
    else if (dist <= 30) score += 5
    else if (dist <= 50) score += 3
    else if (dist <= 100) score += 1
  }

  // is_verified bonus (0-5)
  if (profile.is_verified) score += 5

  return Math.round(score)
}

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
  const [auraMap, setAuraMap] = useState<Record<string, AuraState>>({})
  const [storiesUserIds, setStoriesUserIds] = useState<Set<string>>(new Set())
  const [swipeCount, setSwipeCount] = useState(0)
  const [swipeLimit, setSwipeLimit] = useState(20)
  const [isPremium, setIsPremium] = useState(false)
  const [myPhoto, setMyPhoto] = useState('')
  const [myId, setMyId] = useState('')
  const [myLookingForInternal, setMyLookingForInternal] = useState('')
  const [myMoodInternal, setMyMoodInternal] = useState('')
  const [myGender, setMyGender] = useState<Gender | undefined>()
  const [myInterestedIn, setMyInterestedIn] = useState<string[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [blurPhotos, setBlurPhotos] = useState(false)
  const [unblurredIds, setUnblurredIds] = useState<Set<string>>(new Set())
  const profilesRef = useRef(profiles)
  useEffect(() => { profilesRef.current = profiles }, [profiles])
  const router = useRouter()
  const { toast } = useToast()
  const { confirm } = useConfirm()

  useEffect(() => {
    getPrivacySettings().then(r => { if (r.data) setBlurPhotos(r.data.blur_photos) }).catch(e => { logger.error(e); toast('Erreur de chargement', 'error') })
    getSuperLikesRemaining().then(r => setSuperLikesLeft(r ?? SUPER_LIKE_DAILY)).catch(e => { logger.error(e); toast('Erreur de chargement', 'error') })
    getDailySwipeCount().then(({ count, limit }) => { setSwipeCount(count); setSwipeLimit(limit) }).catch(e => { logger.error(e); toast('Erreur de chargement', 'error') })
    checkPremium().then(setIsPremium).catch(e => { logger.error(e); toast('Erreur de chargement', 'error') })
    fetch('/api/profile/me').then(r => r.json()).then((json) => {
      if (json.profile) {
        setMyId(json.profile.id)
        setMyLookingForInternal(json.profile.looking_for ?? 'friendship')
        setMyMoodInternal(json.profile.mood ?? 'discuter')
        setMyGender(json.profile.gender ?? undefined)
        setMyInterestedIn(json.profile.interested_in ?? [])
        if (json.profile.photos?.[0]) setMyPhoto(json.profile.photos[0])
      }
    }).catch(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setMyId(user.id)
          supabase.from('profiles').select('photos, looking_for, mood, gender, interested_in').eq('id', user.id).maybeSingle().then(({ data }) => {
            if (data) {
              if (data.photos?.[0]) setMyPhoto(data.photos[0])
              setMyLookingForInternal(data.looking_for ?? 'friendship')
              setMyMoodInternal(data.mood ?? 'discuter')
              setMyGender((data as { gender?: string }).gender as Gender | undefined)
              setMyInterestedIn((data as { interested_in?: string[] }).interested_in ?? [])
            }
          }, (err) => logger.error('Discover error', { error: String(err) }))
        }
      }).catch(e => { logger.error(e); toast('Erreur de chargement', 'error') })
    })
  }, [toast])

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
        const { data } = await getProfilesPaginated(exclude, 1, {
          minAge: 18, maxAge: 99,
          gender: myGender,
          interestedIn: myInterestedIn.length > 0 ? myInterestedIn : undefined,
        })
        if (data) {
          setProfiles(data)
          setHasMore(data.length >= DISCOVER_PAGE_SIZE)
        }
        setLoading(false)
      }).catch(e => { logger.error(e); toast('Erreur de chargement', 'error') })
    getSentFlirtIds().then(ids => setFlirtedIds(ids)).catch(() => { toast('Erreur chargement flirts', 'error') })
  }, [myId, toast])

  useEffect(() => {
    getActiveStories().then(({ data }) => {
      if (data) setStoriesUserIds(new Set(data.map((s: { userId: string }) => s.userId)))
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
      const auraRes = await fetch('/api/aura/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: current.map(p => p.id) }),
      })
      if (!cancelled && auraRes.ok) {
        const { auras } = await auraRes.json()
        if (auras) setAuraMap(auras)
      }
      const sorted = [...current].sort((a, b) => {
        const sa = computeProfileScore(a, myLookingForInternal, myMoodInternal, lat, lng)
        const sb = computeProfileScore(b, myLookingForInternal, myMoodInternal, lat, lng)
        if (sa !== sb) return sb - sa
        const qa = scores[a.id] ?? 0
        const qb = scores[b.id] ?? 0
        if (qa !== qb) return qb - qa
        return Math.random() - 0.5
      })
      setProfiles(sorted)
    }
    load()
    return () => { cancelled = true }
  }, [profiles.length, myLookingForInternal, myMoodInternal, lat, lng])

  const fetchProfiles = async (extraBlocked: string[] = [], pageNum = 1) => {
    const swiped = await getSwipedIds()
    const blocked = await getBlockedIds()
    const exclude = [...swiped, ...blocked, ...extraBlocked, myId].filter(Boolean)
    const opts = {
      ...filters, lookingFor: filters.lookingFor || undefined,
      gender: myGender,
      interestedIn: myInterestedIn.length > 0 ? myInterestedIn : undefined,
    }
    let result
    if (filters.city.trim()) {
      result = await searchProfilesByCity(filters.city.trim(), exclude, opts)
    } else if (distanceKm !== null && lat !== null && lng !== null) {
      result = await getProfilesNearby(lat, lng, distanceKm, exclude, opts)
    } else {
      result = await getProfilesPaginated(exclude, pageNum, { ...opts, minAge: filters.minAge, maxAge: filters.maxAge })
    }
    if (result.data) {
      result.data.sort((a, b) => {
        const sa = computeProfileScore(a, myLookingForInternal, myMoodInternal, lat, lng)
        const sb = computeProfileScore(b, myLookingForInternal, myMoodInternal, lat, lng)
        const qa = compatScores[a.id] ?? 0
        const qb = compatScores[b.id] ?? 0
        if (sa !== sb) return sb - sa
        if (qa !== qb) return qb - qa
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

  useEffect(() => {
    getActiveStories().then(({ data }) => {
      if (data) setStoriesUserIds(new Set(data.map((s: { userId: string }) => s.userId)))
    }).catch(() => { toast('Erreur chargement stories', 'error') })
  }, [toast])

  if (loading) return <DiscoverSkeleton />

  return (
    <div className="flex-1 flex flex-col">
      <h1 className="sr-only">Découvrir</h1>
      {/* ─── Header premium ─── */}
      <header className="relative flex items-center justify-between px-4 pt-5 pb-3">
        {/* Glow de titre */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

        <Link href="/discover" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center shadow-glow border border-light/10 transition-transform duration-200 group-hover:scale-105">
            <Heart size={15} fill="white" className="text-theme" />
          </div>
          <span className="text-xl font-bold text-theme tracking-tight" style={logoStyle}>Erosia</span>
        </Link>

        <div className="flex items-center gap-1.5">
          {/* Swipe counter */}
          {!isPremium && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-light/6 bg-card/3">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-glow" />
              <span className="text-[10px] font-semibold text-[var(--text-muted)]">{swipeLimit - swipeCount} left</span>
            </div>
          )}

          {hasSwiped && (
            <button type="button" onClick={handleRewind} aria-label="Revenir en arrière"
              className="w-9 h-9 rounded-full border border-light/6 bg-card/3 flex items-center justify-center transition-all duration-200 hover:border-light/15 hover:bg-card/6 active:scale-90">
              <RotateCcw size={14} className="text-[var(--text-muted)]" />
            </button>
          )}

          <button type="button" onClick={() => setShowFilters(!showFilters)} aria-label="Filtres"
            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-200 active:scale-90 ${
              showFilters
                ? 'border-[var(--primary)]/40 bg-[var(--primary)]/8 text-[var(--primary)]'
                : 'border-light/6 bg-card/3 text-[var(--text-muted)] hover:border-light/15'
            }`}>
            <SlidersHorizontal size={14} />
          </button>

          <button type="button" onClick={() => router.push('/matches')} aria-label="Matchs"
            className="w-9 h-9 rounded-full border border-light/6 bg-card/3 flex items-center justify-center transition-all duration-200 hover:border-light/15 hover:bg-card/6 active:scale-90">
            <MessageCircle size={15} className="text-[var(--text-muted)]" />
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
              <label className="text-xs font-medium text-secondary mb-1.5 block">Âge : {filters.minAge} – {filters.maxAge} ans</label>
              <div className="flex gap-3 items-center">
                <input type="range" min={18} max={70} value={filters.minAge} aria-label="Âge minimum"
                  onChange={e => setFilters(f => ({ ...f, minAge: Math.min(Number(e.target.value), f.maxAge) }))}
                  className="flex-1 accent-[var(--primary)]" />
                <span className="text-muted">–</span>
                <input type="range" min={18} max={70} value={filters.maxAge} aria-label="Âge maximum"
                  onChange={e => setFilters(f => ({ ...f, maxAge: Math.max(Number(e.target.value), f.minAge) }))}
                  className="flex-1 accent-[var(--primary)]" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-secondary mb-1.5 block">Type de relation</label>
              <select value={filters.lookingFor} onChange={e => setFilters(f => ({ ...f, lookingFor: e.target.value }))}
                className="w-full bg-surface-secondary text-theme border border-theme rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary">
                <option value="">Tout</option>
                <option value="friendship">Amitié</option>
                <option value="casual">Plan cul</option>
                <option value="fwb">Friends with benefits</option>
                <option value="serious">Relation sérieuse</option>
                <option value="open">Relation libre</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-secondary mb-1.5 block">Distance</label>
              <select value={distanceKm ?? ''} onChange={e => setDistanceKm(e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-surface-secondary text-theme border border-theme rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary">
                <option value="">Tout</option>
                <option value="10">10 km</option>
                <option value="25">25 km</option>
                <option value="50">50 km</option>
                <option value="100">100 km</option>
              </select>
            </div>
            <div>
              <label htmlFor="filter-city" className="text-xs font-medium text-secondary mb-1.5 block">Ville</label>
              <input id="filter-city" value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))} placeholder="Nom de ville"
                className="w-full bg-surface-secondary text-theme border border-theme rounded-xl px-3 py-2.5 text-sm outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </div>
            <button type="button" onClick={() => { (async () => {
              setShowFilters(false); setLoading(true); setPage(1); setHasMore(true)
              const { data } = await fetchProfiles([], 1)
              if (data) { setProfiles(data); setHasMore(data.length >= DISCOVER_PAGE_SIZE) }
              setLoading(false)
            })().catch(logger.error) }}
              className="w-full py-3 rounded-full text-theme font-semibold text-sm transition-all duration-300 active:scale-[0.97] bg-primary shadow-glow hover:shadow-glow">
              Appliquer les filtres
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Zone carte ─── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-2">
        <AnimatePresence mode="wait">
          {!current ? (
            <motion.div
              key="empty"
              variants={tabVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-center space-y-4"
            >
              <div className="relative w-28 h-28 mx-auto">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[var(--primary)]/12 to-transparent border border-[var(--primary)]/10 flex items-center justify-center">
                  <Globe size={44} className="text-[var(--primary)]/25" />
                </div>
                <div className="absolute inset-0 rounded-3xl bg-[var(--primary)]/5 blur-xl" />
              </div>
              <div>
                <p className="text-xl font-bold text-theme">Tu as tout exploré !</p>
                <p className="text-[var(--text-muted)] text-sm mt-1 max-w-xs mx-auto leading-relaxed">Reviens demain ou élargis tes filtres pour découvrir plus de profils</p>
              </div>
              <button type="button" onClick={() => setShowFilters(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-light/10 bg-card/4 text-sm font-semibold text-[var(--text-secondary)] hover:border-light/20 transition-all duration-200">
                <SlidersHorizontal size={14} />
                Modifier les filtres
              </button>
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
              {/* Indicateurs de swipe gauche/droite */}
              <AnimatePresence>
                {dragStart !== null && dragX > 40 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute top-16 left-6 z-30 px-4 py-2 rounded-full border-2 border-[var(--success)] bg-success/10 backdrop-blur-md">
                    <span className="text-success font-bold text-sm tracking-wider">LIKE ❤️</span>
                  </motion.div>
                )}
                {dragStart !== null && dragX < -40 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute top-16 right-6 z-30 px-4 py-2 rounded-full border-2 border-[var(--error)] bg-error/10 backdrop-blur-md">
                    <span className="text-error font-bold text-sm tracking-wider">NOPE ✕</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <TiltCard className={`relative w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.6)] bg-surface-secondary border border-light/6 transition-all duration-300 ${
                swipeAnim === 'left' ? 'opacity-0 -translate-x-48 rotate-12 scale-90' : swipeAnim === 'right' ? 'opacity-0 translate-x-48 -rotate-12 scale-90' : ''
              }`}>
                <div className="relative w-full h-full">
                  {/* Heart burst animation */}
                  {heartBurst && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                      <motion.div
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1.6, rotate: 5, opacity: 0 }}
                        transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
                      >
                        <Heart size={90} className="text-success" fill="var(--success)" />
                      </motion.div>
                    </div>
                  )}

                  {/* Photo */}
                  {current.photos?.[0] ? (
                    <Image src={current.photos[0]} alt={current.name} fill className={`object-cover pointer-events-none ${blurPhotos && !unblurredIds.has(current.id) ? 'blur-2xl scale-110' : ''}`} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-surface">
                      <Heart size={48} className="text-muted" />
                    </div>
                  )}

                  {/* Blur toggle */}
                  {blurPhotos && !unblurredIds.has(current.id) && (
                    <button type="button" onClick={() => setUnblurredIds(prev => new Set(prev).add(current.id))} aria-label="Voir la photo"
                      className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer bg-transparent">
                      <div className="w-14 h-14 rounded-full bg-theme/50 backdrop-blur-md flex items-center justify-center border border-light/15 shadow-lg">
                        <Eye size={24} className="text-theme" />
                      </div>
                    </button>
                  )}

                  {/* Stories ring */}
                  {storiesUserIds.has(current.id) && (
                    <div className="absolute top-4 left-4 w-12 h-12 rounded-full ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--bg)] z-10 shadow-glow" />
                  )}

                  {/* Badges top-left : Aura, Trust, Energy */}
                  <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                    {auraMap[current.id] && (
                      <div className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold shadow-lg backdrop-blur-md border"
                        style={{
                          background: auraMap[current.id].color + '22',
                          color: auraMap[current.id].color,
                          borderColor: auraMap[current.id].color + '35',
                        }}>
                        ✦ {auraMap[current.id].label} {auraMap[current.id].level}
                      </div>
                    )}
                  </div>

                  {/* Badges top-right : Trust, Energy, Compat */}
                  <div className="absolute top-4 right-4 flex flex-col gap-1.5 items-end">
                    {/* Block button */}
                    <button type="button" onClick={() => { (async () => {
                      if (!current) return
                      if (await confirm('Bloquer ce profil ?')) {
                        await blockProfile(current.id)
                        const { data } = await fetchProfiles([current.id])
                        if (data) setProfiles(data)
                        setIdx(0)
                      }
                    })().catch(logger.error) }} aria-label="Bloquer"
                      className="w-8 h-8 bg-theme/40 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-theme/60 transition-all duration-200">
                      <Shield size={13} className="text-theme/40" />
                    </button>

                    {current.trust_score !== undefined && current.trust_score !== null && (
                      <div className="px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-lg backdrop-blur-md border"
                        style={{
                          background: current.trust_score >= 70 ? 'color-mix(in srgb, var(--info) 18%, transparent)' : current.trust_score >= 40 ? 'color-mix(in srgb, var(--warning) 18%, transparent)' : 'color-mix(in srgb, var(--error) 18%, transparent)',
                          color: current.trust_score >= 70 ? 'var(--info)' : current.trust_score >= 40 ? 'var(--warning)' : 'var(--error)',
                          borderColor: current.trust_score >= 70 ? 'color-mix(in srgb, var(--info) 25%, transparent)' : 'color-mix(in srgb, var(--warning) 20%, transparent)',
                        }}>
                        🛡 {current.trust_score}
                      </div>
                    )}
                    {current.energy_score !== undefined && current.energy_score !== null && (
                      <div className="px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-lg backdrop-blur-md border"
                        style={{
                          background: current.energy_score >= 70 ? 'color-mix(in srgb, var(--success) 18%, transparent)' : 'color-mix(in srgb, var(--warning) 18%, transparent)',
                          color: current.energy_score >= 70 ? 'var(--success)' : 'var(--warning)',
                          borderColor: 'color-mix(in srgb, var(--success) 20%, transparent)',
                        }}>
                        ⚡ {current.energy_score}
                      </div>
                    )}
                    {compatScores[current.id] !== undefined && (
                      <div className="px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-lg backdrop-blur-md"
                        style={{
                          background: compatScores[current.id] >= 70 ? 'color-mix(in srgb, var(--success) 85%, transparent)' : compatScores[current.id] >= 40 ? 'color-mix(in srgb, var(--warning) 85%, transparent)' : 'color-mix(in srgb, var(--error) 85%, transparent)',
                          color: 'var(--textPrimary)',
                        }}>
                        {compatScores[current.id]}% match
                      </div>
                    )}
                  </div>

                  {/* Dégradé bas */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)]/80 via-[var(--bg)]/15 to-transparent pointer-events-none" />

                  {/* Info profil bas */}
                  <div className="absolute bottom-[6.5rem] left-5 right-5 pointer-events-none space-y-1.5">
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-[22px] font-bold text-theme leading-tight">
                        {current.name}
                        {current.is_verified
                          ? <BadgeCheck size={17} className="inline ml-1.5 text-info drop-shadow-[0_0_8px_var(--info)]" />
                          : <span className="inline ml-1.5 text-[10px] font-semibold text-[var(--warning)] border border-[var(--warning)]/30 rounded-full px-2 py-0.5">Non vérifié</span>}
                      </h2>
                      {current.age && <span className="text-lg text-theme/75 font-semibold">{current.age}</span>}
                    </div>
                    {current.location && (
                      <p className="text-theme/60 text-xs flex items-center gap-1">
                        <span className="inline-block w-1 h-1 rounded-full bg-card/40" />
                        {current.location}
                      </p>
                    )}
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {current.mood && (
                        <span className="text-[10px] text-theme/80 bg-card/12 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-light/8">{moodLabel(current.mood)}</span>
                      )}
                      {current.looking_for && (
                        <span className="text-[10px] text-[var(--primary)] bg-[var(--primary)]/12 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-[var(--primary)]/15">{lookingForLabel(current.looking_for)}</span>
                      )}
                      {current.interests?.slice(0, 2).map((i) => (
                        <span key={i} className="text-[10px] text-theme/65 bg-card/8 backdrop-blur-sm px-2 py-0.5 rounded-full">{i}</span>
                      ))}
                    </div>
                  </div>

                  {/* ─── Action buttons ─── */}
                  <div className="absolute bottom-5 left-0 right-0 flex justify-center items-center gap-2.5">
                    {/* Pass */}
                    <button type="button" onClick={() => swipe('pass')} aria-label="Passer"
                      className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 border"
                      style={passBtnStyle}>
                      <X size={24} className="text-error" />
                    </button>

                    {/* Super like */}
                    <div className="relative">
                      <button type="button" onClick={() => swipe('super_like')} aria-label="Super like"
                        className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 border"
                        style={{
                          background: 'color-mix(in srgb, var(--bg) 75%, transparent)',
                          backdropFilter: 'blur(20px)',
                          borderColor: 'color-mix(in srgb, var(--info) 30%, transparent)',
                          boxShadow: superLikesLeft > 0 ? '0 0 16px color-mix(in srgb, var(--info) 15%, transparent), 0 4px 20px color-mix(in srgb, var(--bg) 40%, transparent)' : '0 4px 20px color-mix(in srgb, var(--bg) 40%, transparent)',
                        }}>
                        <Star size={19} className="text-info" fill={superLikesLeft > 0 ? 'var(--info)' : 'none'} />
                      </button>
                      <span className="absolute -top-1.5 -right-2 text-[9px] font-bold text-info/70 bg-theme rounded-full px-1.5 py-0.5 border border-info/30">
                        {superLikesLeft}/{SUPER_LIKE_DAILY}
                      </span>
                    </div>

                    {/* Flirt / wink */}
                    <button type="button" onClick={() => { (async () => {
                      if (!current || flirtedIds.includes(current.id)) return
                      await sendFlirt(current.id)
                      logBehavior('send_flirt', current.id)
                      setFlirtedIds(ids => [...ids, current.id])
                    })().catch(logger.error) }} aria-label="Clin d'oeil"
                      className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 border"
                      style={{
                        background: 'color-mix(in srgb, var(--bg) 75%, transparent)',
                        backdropFilter: 'blur(20px)',
                        borderColor: flirtedIds.includes(current?.id ?? '') ? 'color-mix(in srgb, var(--primary) 35%, transparent)' : 'color-mix(in srgb, var(--textPrimary) 6%, transparent)',
                        boxShadow: flirtedIds.includes(current?.id ?? '') ? '0 0 12px color-mix(in srgb, var(--primary) 15%, transparent)' : 'none',
                      }}>
                      <Eye size={17} className={flirtedIds.includes(current?.id ?? '') ? 'text-[var(--primary)]' : 'text-theme/40'} />
                    </button>

                    {/* Like */}
                    <button type="button" onClick={() => swipe('like')} aria-label="Like"
                      className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 border"
                      style={likeBtnStyle}>
                      <Heart size={24} className="text-success" />
                    </button>

                    {/* Signaler */}
                    <button type="button" onClick={() => setShowReportModal(true)} aria-label="Signaler"
                      className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 border border-light/5"
                      style={reportBtnStyle}>
                      <Flag size={14} className="text-theme/25" />
                    </button>
                  </div>
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
            aria-hidden="true" role="presentation" className="fixed inset-0 bg-theme/80 z-50 flex items-center justify-center p-6 backdrop-blur-sm"
            onClick={() => setShowReportModal(false)}
          >
            <FocusTrap>
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              role="dialog" aria-modal="true" tabIndex={-1}
              className="glass rounded-3xl p-8 max-w-sm w-full text-center"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-theme mb-2">Signaler ce profil</h2>
              <p className="text-secondary text-sm mb-5">Pour quelle raison ?</p>
              <div className="space-y-2">
                {REPORT_REASONS.map((reason) => (
                  <button type="button" key={reason} onClick={() => { (async () => {
                    if (!current) return
                    const { error } = await reportProfile(current.id, reason)
                    setShowReportModal(false)
                    if (error) { toast('Erreur lors du signalement', 'error') }
                    else { toast('Signalement envoyé', 'success') }
                  })().catch(logger.error) }}
                    className="w-full py-3 rounded-xl text-sm font-medium bg-surface-secondary text-theme hover:bg-hover transition-all duration-200 border border-theme">
                    {reason}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setShowReportModal(false)}
                className="w-full py-3 mt-3 text-secondary text-sm hover:text-theme transition-colors duration-200">
                Annuler
              </button>
            </motion.div>
            </FocusTrap>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {matchModal && <MatchModal matchModal={matchModal} myPhoto={myPhoto} onClose={() => setMatchModal(null)} />}
      </AnimatePresence>
    </div>
  )
}
