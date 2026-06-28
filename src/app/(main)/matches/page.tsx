'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MessageCircle, Eye, X, Flame, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { getReceivedFlirts, unmatchUser, getStreak, getDailySwipeCount, type Profile } from '@/lib/api'
import { MatchesSkeleton } from '@/components/Skeleton'
import { useConfirm } from '@/components/ConfirmDialog'

interface Conversation {
  matchId: string
  profile: Profile
}

interface Flirt {
  sender_id: string
  created_at: string
  sender: { name: string; photos: string[] } | null
}

export default function MatchesPage() {
  const [convs, setConvs] = useState<Conversation[]>([])
  const [flirts, setFlirts] = useState<Flirt[]>([])
  const [loading, setLoading] = useState(true)
  const [streak, setStreak] = useState(0)
  const [swipesLeft, setSwipesLeft] = useState(0)
  const { confirm } = useConfirm()

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [{ data: matches }, { data: flirtData }, { data: streakData }, { count, limit }] = await Promise.all([
        supabase.from('matches').select('*').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
        getReceivedFlirts(),
        getStreak(),
        getDailySwipeCount(),
      ])
      if (flirtData) setFlirts(flirtData as Flirt[])
      if (streakData) setStreak(streakData.current_streak ?? 0)
      setSwipesLeft(Math.max(0, limit - count))

      const list: Conversation[] = []
      if (matches) {
        const otherIds = matches.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id)
        if (otherIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('*').in('id', otherIds)
          if (profiles) {
            for (const m of matches) {
              const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id
              const p = profiles.find((p: Record<string, unknown>) => p.id === otherId)
              if (p) list.push({ matchId: m.id, profile: p as Profile })
            }
          }
        }
      }
      setConvs(list)
      setLoading(false)
    })().catch(console.error)
  }, [])

  const handleUnmatch = async (matchId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (await confirm('Supprimer ce match ?')) {
      const { error } = await unmatchUser(matchId)
      if (error) { console.error('unmatch failed', error); return }
      setConvs(prev => prev.filter(c => c.matchId !== matchId))
    }
  }

  if (loading) return <MatchesSkeleton />

  return (
    <div className="flex-1 flex flex-col bg-transparent">
      <header className="px-5 pt-6 pb-4">
        <h2 className="text-3xl font-bold">
          Matchs
          <span className="text-[#9E9488] text-lg ml-2 font-normal">{convs.length}</span>
        </h2>
        <p className="text-[#9E9488] text-sm mt-0.5">Conversations et œillades</p>
        {(streak > 0 || swipesLeft > 0) && (
          <div className="flex gap-3 mt-3">
            {streak > 0 && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#D92D4A]/10 to-transparent px-3 py-1.5 rounded-full border border-[#D92D4A]/10 animate-pulse-soft">
                <Flame size={14} className="text-[#EAB308]" />
                <span className="text-xs font-semibold text-[#EAB308]">{streak} jours</span>
              </div>
            )}
            {swipesLeft > 0 && (
              <div className="flex items-center gap-1.5 bg-[#1C1C1E] px-3 py-1.5 rounded-full border border-[#2A2826]">
                <Sparkles size={14} className="text-[#9E9488]" />
                <span className="text-xs text-[#9E9488]">{swipesLeft} swipes</span>
              </div>
            )}
          </div>
        )}
      </header>

      <div className="flex-1 px-4 pb-4 space-y-3 overflow-y-auto">
        {flirts.length > 0 && (
          <div className="mb-6 animate-fade-up">
            <h3 className="text-sm font-semibold text-[#9E9488] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Eye size={14} className="text-[#D92D4A]" /> Œillades reçues
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {flirts.map((f) => (
                <div key={f.sender_id} className="flex flex-col items-center gap-1.5 min-w-[72px] group">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#262628] to-[#1C1C1E] overflow-hidden border-2 border-[#2A2826] group-hover:border-[#D92D4A]/30 transition-colors p-0.5">
                    <div className="w-full h-full rounded-full overflow-hidden">
                      {f.sender?.photos?.[0] ? (
                        <Image src={f.sender.photos[0]} alt={f.sender.name} width={64} height={64} className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#9E9488] text-lg">?</div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[#9E9488] truncate max-w-[72px]">{f.sender?.name ?? 'Inconnu'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {convs.length === 0 ? (
          <div className="text-center mt-16 animate-fade-up">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D92D4A]/10 to-transparent mx-auto mb-5 flex items-center justify-center border border-[#D92D4A]/10">
              <Heart size={36} className="text-[#D92D4A]/40" />
            </div>
            <h3 className="font-semibold text-lg">Pas encore de matchs</h3>
            <p className="text-[#9E9488] text-sm mt-1 max-w-xs mx-auto leading-relaxed">
              Continue à découvrir des profils et trouve l&rsquo;âme qui te correspond.
            </p>
            <Link href="/discover" className="inline-block mt-6 px-8 py-3 rounded-full text-white font-semibold text-sm transition-all hover:shadow-[0_0_20px_rgba(217,45,74,0.3)] active:scale-95"
              style={{ background: '#D92D4A' }}>
              Découvrir
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {convs.map((c, i) => (
              <Link key={c.matchId} href={`/chat/${c.matchId}`}
                className="flex items-center gap-3 p-3 glass-card rounded-2xl transition-all duration-200 hover:border-[#D92D4A]/20 active:scale-[0.98] group animate-slide-up"
                style={{ animationDelay: `${i * 80}ms` }}>
                <div className="relative shrink-0">
                  <Image src={c.profile.photos?.[0] ?? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'} alt={c.profile.name} width={56} height={56}
                    className="rounded-full object-cover w-14 h-14 bg-[#262628] ring-2 ring-[#2A2826]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{c.profile.name}</p>
                  <p className="text-xs text-[#9E9488] truncate mt-0.5">Dites bonjour 👋</p>
                </div>
                  <MessageCircle size={18} className="text-[#5A5248] group-hover:text-[#D92D4A] transition-colors" />
                <button type="button" aria-label="Ne plus match" onClick={(e) => handleUnmatch(c.matchId, e)} className="p-2.5 -mr-1 opacity-0 focus:opacity-100 group-hover:opacity-100 transition-opacity">
                  <X size={14} className="text-[#5A5248] hover:text-red-500 transition-colors" />
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
