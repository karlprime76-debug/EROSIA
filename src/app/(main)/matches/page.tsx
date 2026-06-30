'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, MessageCircle, X, Star, Archive, MoreHorizontal, ShieldOff } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { unmatchUser } from '@/lib/api'

function formatMessageTime(date: string | Date) {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (diff < 172800000) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function truncateMessage(text: string | null | undefined, max = 80) {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '…' : text
}
import { MatchesSkeleton } from '@/components/Skeleton'
import { OnlineStatus } from '@/components/chat/OnlineStatus'
import { TypingDots } from '@/components/chat/TypingIndicator'
import { useToast } from '@/components/Toast'

interface ChatProfile {
  id: string; name: string; age: number | null; photos: string[]
  mood: string | null; trust_score?: number; energy_score?: number
}

interface ConvItem {
  matchId: string; profile: ChatProfile
  lastMessage: { text: string | null; image_url: string | null; created_at: string; sender_id: string } | null
  unreadCount: number; isTyping: boolean; isFavorite: boolean; isArchived: boolean
}

type FilterMode = 'all' | 'unread' | 'favorites'

export default function ConversationsPage() {
  const [convs, setConvs] = useState<ConvItem[]>([])
  const [myId, setMyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({})
  const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({})
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setLoading(false); return }
      setMyId(data.user.id)
      const uid = data.user.id

      const { data: matches } = await supabase
        .from('matches').select('*').or(`user1_id.eq.${uid},user2_id.eq.${uid}`).order('created_at', { ascending: false })

      const list: ConvItem[] = []
      if (matches) {
        const otherIds = matches.map(m => m.user1_id === uid ? m.user2_id : m.user1_id)
        const { data: pData } = await supabase.from('profiles').select('id,name,age,photos,mood,trust_score,energy_score').in('id', otherIds)
        const profiles = (pData || []) as Array<{ id: string; name: string; age: number | null; photos: string[]; mood: string | null; trust_score: number | null; energy_score: number | null }>

        for (const m of matches) {
          const otherId = m.user1_id === uid ? m.user2_id : m.user1_id
          const p = profiles.find(p => p.id === otherId)
          if (!p) continue

          const { data: lastMsg } = await supabase
            .from('messages').select('text,image_url,created_at,sender_id')
            .eq('match_id', m.id).order('created_at', { ascending: false }).limit(1).maybeSingle()

          list.push({
            matchId: m.id,
            profile: {
              id: p.id, name: p.name, age: p.age, photos: p.photos || [],
              mood: p.mood || null, trust_score: p.trust_score ?? undefined, energy_score: p.energy_score ?? undefined,
            },
            lastMessage: lastMsg || null,
            unreadCount: 0,
            isTyping: false, isFavorite: false, isArchived: false,
          })
        }
      }
      setConvs(list)

      list.forEach(c => {
        const ch = supabase.channel(`typing:match-${c.matchId}`)
        ch.on('broadcast', { event: 'typing' }, (payload: { payload?: { userId?: string } }) => {
          setTypingMap(prev => ({ ...prev, [c.matchId]: payload.payload?.userId === c.profile.id }))
        })
        ch.subscribe()
      })

      list.forEach(c => {
        const ch = supabase.channel(`presence:${c.profile.id}`, { config: { presence: { key: '' } } })
        ch.on('presence', { event: 'sync' }, () => {
          const state = ch.presenceState()
          setOnlineMap(prev => ({ ...prev, [c.profile.id]: Object.keys(state).length > 0 }))
        })
        ch.subscribe()
      })

      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    let result = [...convs]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c => c.profile.name.toLowerCase().includes(q))
    }
    if (filter === 'unread') result = result.filter(c => c.unreadCount > 0)
    if (filter === 'favorites') result = result.filter(c => c.isFavorite)
    result.sort((a, b) => {
      const aTime = a.lastMessage?.created_at || a.matchId
      const bTime = b.lastMessage?.created_at || b.matchId
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })
    return result
  }, [convs, searchQuery, filter])

  const handleUnmatch = async (matchId: string) => {
    setConvs(prev => prev.filter(c => c.matchId !== matchId))
    const { error } = await unmatchUser(matchId)
    if (error) {
      setConvs(prev => [...prev])
      toast('Erreur lors de la suppression', 'error')
    }
  }

  const toggleFavorite = (matchId: string) => {
    setConvs(prev => prev.map(c => c.matchId === matchId ? { ...c, isFavorite: !c.isFavorite } : c))
  }

  const toggleArchive = (matchId: string) => {
    setConvs(prev => prev.map(c => c.matchId === matchId ? { ...c, isArchived: !c.isArchived } : c))
  }

  if (loading) return <MatchesSkeleton />

  return (
    <div className="flex-1 flex flex-col bg-transparent">
      <header className="px-5 pt-6 pb-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-3xl font-bold">Messages</h2>
          <span className="text-[#9E9488] text-sm">{filtered.length}</span>
        </div>
        <p className="text-[#9E9488] text-sm">Conversations et matchs</p>
      </header>

      <div className="px-4 pb-2">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A5248]" />
          <input
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher une conversation..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#1C1C1E] text-white text-sm border border-[#2A2826] outline-none focus:border-[#D92D4A]/30 transition-colors placeholder:text-[#5A5248]"
          />
        </div>
      </div>

      <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
        {(['all', 'unread', 'favorites'] as FilterMode[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${filter === f ? 'bg-[#D92D4A] text-white' : 'bg-[#1C1C1E] text-[#9E9488] border border-[#2A2826]'}`}>
            {f === 'all' ? 'Toutes' : f === 'unread' ? 'Non lues' : 'Favoris'}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D92D4A]/10 to-transparent mx-auto mb-4 flex items-center justify-center border border-[#D92D4A]/10">
              <MessageCircle size={28} className="text-[#D92D4A]/40" />
            </div>
            <h3 className="font-semibold text-lg">
              {searchQuery ? 'Aucun résultat' : filter !== 'all' ? 'Aucune conversation' : 'Pas encore de messages'}
            </h3>
            <p className="text-[#9E9488] text-sm mt-1 max-w-xs">
              {searchQuery ? 'Essaie un autre terme de recherche.' : 'Match avec quelqu\'un pour commencer à discuter.'}
            </p>
            {!searchQuery && filter === 'all' && (
              <Link href="/discover" className="inline-block mt-6 px-8 py-3 rounded-full text-white font-semibold text-sm transition-all active:scale-95"
                style={{ background: '#D92D4A' }}>
                Découvrir
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map(c => (
              <ConversationCard
                key={c.matchId}
                conv={c}
                myId={myId}
                isOnline={onlineMap[c.profile.id] || false}
                isTyping={typingMap[c.matchId] || false}
                menuOpen={menuOpen}
                onMenuOpen={setMenuOpen}
                onUnmatch={handleUnmatch}
                onToggleFavorite={toggleFavorite}
                onToggleArchive={toggleArchive}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ConversationCard({ conv, myId, isOnline, isTyping, menuOpen, onMenuOpen, onUnmatch, onToggleFavorite, onToggleArchive }: {
  conv: ConvItem; myId: string; isOnline: boolean; isTyping: boolean
  menuOpen: string | null; onMenuOpen: (id: string | null) => void
  onUnmatch: (id: string) => void; onToggleFavorite: (id: string) => void; onToggleArchive: (id: string) => void
}) {
  const p = conv.profile
  const lastMsg = conv.lastMessage
  const isOwn = lastMsg?.sender_id === myId
  const previewText = isTyping
    ? <span className="flex items-center gap-1"><TypingDots /></span>
    : lastMsg?.text
      ? truncateMessage(lastMsg.text, 60)
      : lastMsg?.image_url
        ? '📷 Photo'
        : <span className="italic text-[#5A5248]">Dites bonjour !</span>

  return (
    <Link href={`/chat/${conv.matchId}`} className="relative flex items-center gap-3 p-3 rounded-2xl hover:bg-[#1C1C1E]/60 transition-colors group">
      <div className="relative shrink-0">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-[#262628] ring-2 ring-[#2A2826]">
          {p.photos?.[0] ? (
            <Image src={p.photos[0]} alt={p.name} width={56} height={56} className="object-cover w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#9E9488]">?</div>
          )}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5">
          <OnlineStatus isOnline={isOnline} size="sm" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate">{p.name}</span>
          {p.age && <span className="text-xs text-[#9E9488]">{p.age} ans</span>}
          {p.mood && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#D92D4A]/10 text-[#D92D4A] truncate max-w-[60px]">
              {p.mood}
            </span>
          )}
          {p.trust_score !== undefined && p.trust_score >= 7 && (
            <ShieldOff size={12} className="text-[#22C55E]" />
          )}
          {conv.isFavorite && <Star size={12} className="text-[#EAB308] fill-[#EAB308]" />}
        </div>
        <div className="flex items-center gap-2 text-xs text-[#9E9488] mt-0.5">
          <span className="truncate flex-1">
            {isOwn && <span className="text-[#5A5248]">Vous : </span>}
            {previewText}
          </span>
          {lastMsg?.created_at && (
            <span className="shrink-0 text-[10px]">{formatMessageTime(lastMsg.created_at)}</span>
          )}
        </div>
      </div>

      {conv.unreadCount > 0 && (
        <div className="shrink-0 w-5 h-5 rounded-full bg-[#D92D4A] flex items-center justify-center">
          <span className="text-[9px] font-bold text-white">{conv.unreadCount > 9 ? '9+' : conv.unreadCount}</span>
        </div>
      )}

      <div className="relative">
        <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); onMenuOpen(menuOpen === conv.matchId ? null : conv.matchId) }}
          className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-[#262628]">
          <MoreHorizontal size={16} className="text-[#5A5248]" />
        </button>
        {menuOpen === conv.matchId && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => onMenuOpen(null)} />
            <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-[#1C1C1E] rounded-xl border border-[#2A2826] shadow-xl overflow-hidden py-1">
              <button onClick={e => { e.preventDefault(); onToggleFavorite(conv.matchId); onMenuOpen(null) }}
                className="w-full px-4 py-2.5 text-sm text-left hover:bg-[#262628] flex items-center gap-2.5">
                <Star size={14} className={conv.isFavorite ? 'text-[#EAB308] fill-[#EAB308]' : 'text-[#9E9488]'} />
                {conv.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              </button>
              <button onClick={e => { e.preventDefault(); onToggleArchive(conv.matchId); onMenuOpen(null) }}
                className="w-full px-4 py-2.5 text-sm text-left hover:bg-[#262628] flex items-center gap-2.5">
                <Archive size={14} className="text-[#9E9488]" />
                {conv.isArchived ? 'Désarchiver' : 'Archiver'}
              </button>
              <button onClick={e => { e.preventDefault(); onUnmatch(conv.matchId); onMenuOpen(null) }}
                className="w-full px-4 py-2.5 text-sm text-left hover:bg-[#262628] flex items-center gap-2.5 text-red-400">
                <X size={14} />
                Supprimer
              </button>
            </div>
          </>
        )}
      </div>
    </Link>
  )
}
