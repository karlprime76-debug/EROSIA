'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, MessageCircle, X, Star, Archive, MoreHorizontal, ShieldOff } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { unmatchUser } from '@/lib/api'
import { formatMessageTime, truncateMessage } from '@/lib/chat/utils'
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

const PAGE_SIZE = 50

export default function ConversationsPage() {
  const [convs, setConvs] = useState<ConvItem[]>([])
  const [myId, setMyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({})
  const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({})
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const { toast } = useToast()
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([])
  const pageRef = useRef(0)

  const loadMatches = useCallback(async (uid: string, page: number) => {
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    let matches
    try {
      const res = await supabase
        .from('matches').select('*').or(`user1_id.eq.${uid},user2_id.eq.${uid}`).order('created_at', { ascending: false }).range(from, to)
      matches = res.data
    } catch {
      toast('Erreur lors du chargement des matchs', 'error')
      return { list: [] as ConvItem[], hasMore: false }
    }

    if (!matches || matches.length < PAGE_SIZE) setHasMore(false)
    const list: ConvItem[] = []
    if (matches && matches.length > 0) {
      const otherIds = matches.map(m => m.user1_id === uid ? m.user2_id : m.user1_id)
      const { data: pData } = await supabase.from('profiles').select('id,name,age,photos,mood,trust_score,energy_score').in('id', otherIds)
      const profiles = (pData || []) as Array<{ id: string; name: string; age: number | null; photos: string[]; mood: string | null; trust_score: number | null; energy_score: number | null }>

      const matchIds = matches.map(m => m.id)
      const { data: allLastMsgs } = await supabase
        .from('messages')
        .select('match_id, text, image_url, created_at, sender_id')
        .in('match_id', matchIds)
        .order('created_at', { ascending: false })

      const lastMsgByMatch: Record<string, { match_id: string; text: string | null; image_url: string | null; created_at: string; sender_id: string }> = {}
      const unreadByMatch: Record<string, number> = {}
      if (allLastMsgs) {
        for (const msg of allLastMsgs) {
          if (!lastMsgByMatch[msg.match_id]) lastMsgByMatch[msg.match_id] = msg
          if (msg.sender_id !== uid) unreadByMatch[msg.match_id] = (unreadByMatch[msg.match_id] || 0) + 1
        }
      }

      for (const m of matches) {
        const otherId = m.user1_id === uid ? m.user2_id : m.user1_id
        const p = profiles.find(p => p.id === otherId)
        if (!p) continue

        list.push({
          matchId: m.id,
          profile: {
            id: p.id, name: p.name, age: p.age, photos: p.photos || [],
            mood: p.mood || null, trust_score: p.trust_score ?? undefined, energy_score: p.energy_score ?? undefined,
          },
          lastMessage: lastMsgByMatch[m.id] || null,
          unreadCount: unreadByMatch?.[m.id] ?? 0,
          isTyping: false, isFavorite: false, isArchived: false,
        })
      }
    }
    return { list, hasMore: matches ? matches.length >= PAGE_SIZE : false }
  }, [toast])

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return
      if (!data.user) { setLoading(false); return }
      setMyId(data.user.id)
      const uid = data.user.id

      const { list } = await loadMatches(uid, 0)
      if (!cancelled) setConvs(list)

      const matchIds = list.map(c => c.matchId)
      if (matchIds.length > 0) {
        const typingChannel = supabase.channel('matches-typing')
        channelsRef.current.push(typingChannel)
        typingChannel.on('broadcast', { event: 'typing' }, (payload: { payload?: { matchId?: string; userId?: string } }) => {
          if (payload.payload?.matchId && matchIds.includes(payload.payload.matchId) && payload.payload?.userId) {
            setTypingMap(prev => ({ ...prev, [payload.payload!.matchId!]: true }))
            setTimeout(() => setTypingMap(prev => { const n = { ...prev }; delete n[payload.payload!.matchId!]; return n }), 3000)
          }
        })
        typingChannel.subscribe()
      }

      const presenceChannel = supabase.channel('online-users')
      channelsRef.current.push(presenceChannel)
      presenceChannel.on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const online: Record<string, boolean> = {}
        for (const [userId] of Object.entries(state)) {
          online[userId] = true
        }
        if (!cancelled) setOnlineMap(online)
      })
      presenceChannel.subscribe()

      if (!cancelled) setLoading(false)
    }).catch(() => { toast('Erreur', 'error') })

    return () => {
      cancelled = true
      channelsRef.current.forEach(ch => supabase.removeChannel(ch))
      channelsRef.current = []
    }
  }, [toast, loadMatches])

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

  const handleLoadMore = async () => {
    if (!myId || loadingMore) return
    setLoadingMore(true)
    pageRef.current += 1
    const uid = myId
    const { list } = await loadMatches(uid, pageRef.current)
    setConvs(prev => [...prev, ...list])
    setLoadingMore(false)
  }

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
      <h1 className="sr-only">Mes matchs</h1>
      <header className="px-5 pt-6 pb-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-3xl font-bold">Messages</h2>
          <span className="text-secondary text-sm">{filtered.length}</span>
        </div>
        <p className="text-secondary text-sm">Conversations et matchs</p>
      </header>

      <div className="px-4 pb-2">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher une conversation..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface text-theme text-sm border border-theme outline-none focus:border-primary/30 transition-colors placeholder:text-muted"
          />
        </div>
      </div>

      <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
        {(['all', 'unread', 'favorites'] as FilterMode[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${filter === f ? 'bg-primary text-theme' : 'bg-surface text-secondary border border-theme'}`}>
            {f === 'all' ? 'Toutes' : f === 'unread' ? 'Non lues' : 'Favoris'}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 to-transparent mx-auto mb-4 flex items-center justify-center border border-primary/10">
              <MessageCircle size={28} className="text-primary/40" />
            </div>
            <h3 className="font-semibold text-lg">
              {searchQuery ? 'Aucun résultat' : filter !== 'all' ? 'Aucune conversation' : 'Pas encore de messages'}
            </h3>
            <p className="text-secondary text-sm mt-1 max-w-xs">
              {searchQuery ? 'Essaie un autre terme de recherche.' : 'Match avec quelqu\'un pour commencer à discuter.'}
            </p>
            {!searchQuery && filter === 'all' && (
              <Link href="/discover" className="inline-block mt-6 px-8 py-3 rounded-full text-theme font-semibold text-sm transition-all active:scale-95"
                style={{ background: 'var(--primary)' }}>
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
            {hasMore && (
              <button onClick={handleLoadMore} disabled={loadingMore}
                className="w-full py-3 text-sm text-secondary hover:text-theme transition-colors disabled:opacity-50">
                {loadingMore ? 'Chargement...' : 'Voir plus'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const ConversationCard = React.memo(function ConversationCard({ conv, myId, isOnline, isTyping, menuOpen, onMenuOpen, onUnmatch, onToggleFavorite, onToggleArchive }: {
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
        : <span className="italic text-muted">Dites bonjour !</span>

  return (
    <Link href={`/chat/${conv.matchId}`} className="relative flex items-center gap-3 p-3 rounded-2xl hover:bg-surface/60 transition-colors group">
      <div className="relative shrink-0">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-hover ring-2 ring-theme">
          {p.photos?.[0] ? (
            <Image src={p.photos[0]} alt={p.name} width={56} height={56} className="object-cover w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-secondary">?</div>
          )}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5">
          <OnlineStatus isOnline={isOnline} size="sm" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate">{p.name}</span>
          {p.age && <span className="text-xs text-secondary">{p.age} ans</span>}
          {p.mood && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary truncate max-w-[60px]">
              {p.mood}
            </span>
          )}
          {p.trust_score !== undefined && p.trust_score >= 7 && (
            <ShieldOff size={12} className="text-success" />
          )}
          {conv.isFavorite && <Star size={12} className="text-warning fill-[var(--warning)]" />}
        </div>
        <div className="flex items-center gap-2 text-xs text-secondary mt-0.5">
          <span className="truncate flex-1">
            {isOwn && <span className="text-muted">Vous : </span>}
            {previewText}
          </span>
          {lastMsg?.created_at && (
            <span className="shrink-0 text-[10px]">{formatMessageTime(lastMsg.created_at)}</span>
          )}
        </div>
      </div>

      {conv.unreadCount > 0 && (
        <div className="shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <span className="text-[9px] font-bold text-theme">{conv.unreadCount > 9 ? '9+' : conv.unreadCount}</span>
        </div>
      )}

      <div className="relative">
        <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); onMenuOpen(menuOpen === conv.matchId ? null : conv.matchId) }} aria-label="Menu"
          className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-hover">
          <MoreHorizontal size={16} className="text-muted" />
        </button>
        {menuOpen === conv.matchId && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => onMenuOpen(null)} />
            <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-surface rounded-xl border border-theme shadow-xl overflow-hidden py-1">
              <button onClick={e => { e.preventDefault(); onToggleFavorite(conv.matchId); onMenuOpen(null) }}
                className="w-full px-4 py-2.5 text-sm text-left hover:bg-hover flex items-center gap-2.5">
                <Star size={14} className={conv.isFavorite ? 'text-warning fill-[var(--warning)]' : 'text-secondary'} />
                {conv.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              </button>
              <button onClick={e => { e.preventDefault(); onToggleArchive(conv.matchId); onMenuOpen(null) }}
                className="w-full px-4 py-2.5 text-sm text-left hover:bg-hover flex items-center gap-2.5">
                <Archive size={14} className="text-secondary" />
                {conv.isArchived ? 'Désarchiver' : 'Archiver'}
              </button>
              <button onClick={e => { e.preventDefault(); onUnmatch(conv.matchId); onMenuOpen(null) }}
                className="w-full px-4 py-2.5 text-sm text-left hover:bg-hover flex items-center gap-2.5 text-error">
                <X size={14} />
                Supprimer
              </button>
            </div>
          </>
        )}
      </div>
    </Link>
  )
})
