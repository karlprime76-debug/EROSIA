'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, MessageCircle, Heart, X, Star, MapPin, Zap, Crown, Sparkles, Compass, BadgeCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { getDailyProfile, getCompatibilityBatch, unmatchUser, type Profile } from '@/lib/api'
import { MatchesSkeleton } from '@/components/Skeleton'
import { useToast } from '@/components/Toast'

interface MatchProfile {
  matchId: string
  profileId: string
  name: string
  age: number | null
  photo: string | null
  location: string | null
  isVerified: boolean
  mood: string | null
  lookingFor: string | null
  isFavorite: boolean
  isNew: boolean
  compatibility: number | null
  createdAt: string
}

export default function MatchesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [allMatches, setAllMatches] = useState<MatchProfile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [dailyProfile, setDailyProfile] = useState<Profile | null>(null)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) { setLoading(false); return }

      const { data: matchRows } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (!matchRows || cancelled) { setLoading(false); return }

      const otherIds = matchRows.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id)
      const { data: pData } = await supabase
        .from('profiles')
        .select('id, name, age, photos, location, is_verified, mood, looking_for, latitude, longitude')
        .in('id', otherIds)

      const list: MatchProfile[] = matchRows.map(m => {
        const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id
        const p = (pData ?? []).find((p: { id: string }) => p.id === otherId) as Record<string, unknown> | undefined
        if (!p) return null
        const now = new Date()
        const matchDate = new Date(m.created_at)
        const isNew = (now.getTime() - matchDate.getTime()) < 24 * 60 * 60 * 1000
        return {
          matchId: m.id,
          profileId: p.id as string,
          name: (p.name ?? 'Inconnu') as string,
          age: (p.age ?? null) as number | null,
          photo: ((p.photos as string[]) ?? [])[0] ?? null,
          location: (p.location ?? null) as string | null,
          isVerified: (p.is_verified ?? false) as boolean,
          mood: (p.mood ?? null) as string | null,
          lookingFor: (p.looking_for ?? null) as string | null,
          isFavorite: false,
          isNew,
          compatibility: null,
          createdAt: m.created_at,
        }
      }).filter(Boolean) as MatchProfile[]

      if (!cancelled) setAllMatches(list)

      // Load compatibility scores for all matches
      if (list.length > 0) {
        const scores = await getCompatibilityBatch(list.map(m => m.profileId))
        if (!cancelled) {
          setAllMatches(prev => prev.map(m => ({ ...m, compatibility: scores[m.profileId] ?? null })))
        }
      }

      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [toast])

  useEffect(() => {
    getDailyProfile().then(({ data }) => { if (data) setDailyProfile(data) }).catch(() => {})
  }, [])

  const toggleFavorite = (matchId: string) => {
    setAllMatches(prev => prev.map(m => m.matchId === matchId ? { ...m, isFavorite: !m.isFavorite } : m))
  }

  const handleUnmatch = async (matchId: string) => {
    const match = allMatches.find(m => m.matchId === matchId)
    setAllMatches(prev => prev.filter(m => m.matchId !== matchId))
    const { error } = await unmatchUser(matchId)
    if (error) {
      if (match) setAllMatches(prev => [...prev, match])
      toast('Erreur lors de la suppression', 'error')
    }
  }

  const newMatches = useMemo(() => allMatches.filter(m => m.isNew), [allMatches])

  const filteredMatches = useMemo(() => {
    let result = allMatches
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(m => m.name.toLowerCase().includes(q))
    }
    if (showFavoritesOnly) result = result.filter(m => m.isFavorite)
    return result
  }, [allMatches, searchQuery, showFavoritesOnly])

  const highCompat = useMemo(() =>
    [...filteredMatches].filter(m => m.compatibility !== null && m.compatibility >= 70).sort((a, b) => (b.compatibility ?? 0) - (a.compatibility ?? 0)).slice(0, 6),
  [filteredMatches])

  if (loading) return <MatchesSkeleton />

  return (
    <div className="flex-1 flex flex-col bg-transparent">
      <header className="px-5 pt-6 pb-3">
        <h1 className="text-3xl font-bold">Matchs</h1>
        <p className="text-secondary text-sm mt-0.5">Gère tes matchs et découvre qui te correspond</p>
      </header>

      <div className="px-4 pb-2">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher un match..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface text-theme text-sm border border-theme outline-none focus:border-primary/30 transition-colors placeholder:text-muted" />
        </div>
      </div>

      <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
        <button onClick={() => setShowFavoritesOnly(false)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${!showFavoritesOnly ? 'bg-primary text-theme' : 'bg-surface text-secondary border border-theme'}`}>
          Tous ({allMatches.length})
        </button>
        <button onClick={() => setShowFavoritesOnly(true)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${showFavoritesOnly ? 'bg-primary text-theme' : 'bg-surface text-secondary border border-theme'}`}>
          <Star size={12} className="inline mr-1" />Favoris
        </button>
      </div>

      <div className="flex-1 px-4 pb-4 overflow-y-auto space-y-6">
        {allMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 to-transparent mx-auto mb-4 flex items-center justify-center border border-primary/10">
              <Heart size={28} className="text-primary/40" />
            </div>
            <h3 className="font-semibold text-lg">Aucun match pour le moment</h3>
            <p className="text-secondary text-sm mt-1 max-w-xs">Continue à explorer et like des profils pour faire des matchs !</p>
            <Link href="/discover" className="inline-block mt-6 px-8 py-3 rounded-full text-theme font-semibold text-sm transition-all active:scale-95"
              style={{ background: 'var(--primary)' }}>
              Découvrir des profils
            </Link>
          </div>
        ) : (
          <>
            {/* Nouveaux matchs */}
            {newMatches.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-primary" />
                  <h2 className="font-semibold text-sm">Nouveaux matchs</h2>
                  <span className="text-[10px] text-primary font-medium px-1.5 py-0.5 rounded-full bg-primary/10">{newMatches.length}</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {newMatches.map(m => (
                    <MatchCard key={m.matchId} match={m} onToggleFavorite={toggleFavorite} onUnmatch={handleUnmatch} />
                  ))}
                </div>
              </section>
            )}

            {/* Match du jour */}
            {dailyProfile && (
              <section className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Crown size={16} className="text-amber-400" />
                  <h2 className="font-semibold text-sm">Match du jour</h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-hover shrink-0 ring-2 ring-amber-400/50">
                    {dailyProfile.photos?.[0] ? (
                      <Image src={dailyProfile.photos[0]} alt={dailyProfile.name} width={64} height={64} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-secondary">?</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{dailyProfile.name}{dailyProfile.age ? `, ${dailyProfile.age}` : ''}</div>
                    {dailyProfile.bio && <p className="text-xs text-secondary truncate mt-0.5">{dailyProfile.bio}</p>}
                  </div>
                  <Link href={`/profile/${dailyProfile.id}`}
                    className="px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-medium active:scale-90 transition shrink-0">
                    Voir
                  </Link>
                </div>
              </section>
            )}

            {/* Haute compatibilité */}
            {highCompat.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={16} className="text-success" />
                  <h2 className="font-semibold text-sm">Profils à forte compatibilité</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {highCompat.map(m => (
                    <div key={m.matchId} className="glass rounded-2xl overflow-hidden">
                      <Link href={`/profile/${m.profileId}`} className="block aspect-[3/4] relative bg-hover">
                        {m.photo ? (
                          <Image src={m.photo} alt={m.name} fill className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-secondary"><Heart size={24} /></div>
                        )}
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-success/80 text-[10px] font-bold text-theme">
                          {m.compatibility}%
                        </div>
                      </Link>
                      <div className="p-2.5">
                        <div className="font-semibold text-sm truncate flex items-center gap-1">
                          {m.name}
                          {m.isVerified && <BadgeCheck size={12} className="text-info shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Link href={`/chat/${m.matchId}`}
                            className="flex-1 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium text-center active:scale-90 transition">
                            Message
                          </Link>
                          <button onClick={() => handleUnmatch(m.matchId)}
                            className="p-1.5 rounded-full bg-error/10 text-error/60 hover:bg-error/20 transition" aria-label="Supprimer">
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tous les matchs */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Heart size={16} className="text-primary" />
                <h2 className="font-semibold text-sm">Tous les matchs</h2>
                <span className="text-[10px] text-secondary font-medium">{filteredMatches.length}</span>
              </div>
              {filteredMatches.length === 0 ? (
                <p className="text-sm text-secondary text-center py-8">
                  {showFavoritesOnly ? 'Aucun favori' : searchQuery ? 'Aucun résultat' : 'Aucun match'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredMatches.map(m => (
                    <div key={m.matchId} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface/60 transition-colors group">
                      <Link href={`/profile/${m.profileId}`} className="shrink-0">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-hover ring-2 ring-theme">
                          {m.photo ? (
                            <Image src={m.photo} alt={m.name} width={56} height={56} className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-secondary">?</div>
                          )}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/profile/${m.profileId}`} className="font-semibold text-sm flex items-center gap-1.5">
                          {m.name}{m.age ? `, ${m.age}` : ''}
                          {m.isVerified && <BadgeCheck size={12} className="text-info" />}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-secondary mt-0.5">
                          {m.location && <span className="flex items-center gap-1"><MapPin size={10} />{m.location}</span>}
                          {m.compatibility !== null && <span className="text-success font-medium">{m.compatibility}%</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => toggleFavorite(m.matchId)}
                          className="p-2.5 rounded-lg hover:bg-hover transition" aria-label="Favori">
                          <Star size={14} className={m.isFavorite ? 'text-warning fill-[var(--warning)]' : 'text-muted'} />
                        </button>
                        <Link href={`/chat/${m.matchId}`}
                          className="p-2.5 rounded-lg hover:bg-primary/10 transition" aria-label="Message">
                          <MessageCircle size={14} className="text-primary" />
                        </Link>
                        <button onClick={() => handleUnmatch(m.matchId)}
                          className="p-2.5 rounded-lg hover:bg-error/10 transition" aria-label="Supprimer">
                          <X size={14} className="text-muted hover:text-error" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Découvrir plus */}
            <div className="text-center py-4">
              <Link href="/discover"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-on-primary text-sm font-semibold active:scale-95 transition">
                <Compass size={16} />
                Découvrir plus de profils
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MatchCard({ match, onToggleFavorite, onUnmatch }: {
  match: MatchProfile
  onToggleFavorite: (id: string) => void
  onUnmatch: (id: string) => void
}) {
  return (
    <div className="glass rounded-2xl overflow-hidden shrink-0 w-40">
      <Link href={`/profile/${match.profileId}`} className="block aspect-[3/4] relative bg-hover">
        {match.photo ? (
          <Image src={match.photo} alt={match.name} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-secondary"><Heart size={24} /></div>
        )}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <div className="text-white text-sm font-semibold truncate">{match.name}{match.age ? `, ${match.age}` : ''}</div>
        </div>
      </Link>
      <div className="flex items-center gap-1 p-2">
        <Link href={`/chat/${match.matchId}`}
          className="flex-1 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium text-center active:scale-90 transition">
          Message
        </Link>
        <button onClick={() => onToggleFavorite(match.matchId)}
          className="p-1.5 rounded-full hover:bg-hover transition" aria-label="Favori">
          <Star size={12} className={match.isFavorite ? 'text-warning fill-[var(--warning)]' : 'text-muted'} />
        </button>
        <button onClick={() => onUnmatch(match.matchId)}
          className="p-1.5 rounded-full hover:bg-error/10 transition" aria-label="Supprimer">
          <X size={12} className="text-muted" />
        </button>
      </div>
    </div>
  )
}
