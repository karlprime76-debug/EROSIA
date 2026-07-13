'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, MessageCircle, Star, Archive, MoreHorizontal, Pin } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { formatMessageTime, truncateMessage } from '@/lib/chat/utils'
import { MatchesSkeleton } from '@/components/Skeleton'
import { OnlineStatus } from '@/components/chat/OnlineStatus'
import { TypingDots } from '@/components/chat/TypingIndicator'

interface ConvProfile {
  id: string; name: string; photos: string[]
}

interface LastMessage {
  text: string | null; image_url: string | null; created_at: string; sender_id: string
}

interface Conversation {
  matchId: string
  profile: ConvProfile
  lastMessage: LastMessage | null
  unreadCount: number
  isTyping: boolean
  isFavorite: boolean
  isArchived: boolean
  isPinned: boolean
}

type FilterMode = 'all' | 'unread' | 'favorites' | 'archived'

const PAGE_SIZE = 50

export default function MessagesPage() {
  const [convs, setConvs] = useState<Conversation[]>([])
  const [myId, setMyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const chRef = useRef<ReturnType<typeof supabase.channel>[]>([])

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return
      if (!data.user) { setLoading(false); return }
      const uid = data.user.id
      setMyId(uid)

      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (!matches || cancelled) { setLoading(false); return }

      const otherIds = matches.map(m => m.user1_id === uid ? m.user2_id : m.user1_id)
      const { data: pData } = await supabase
        .from('profiles')
        .select('id, name, photos')
        .in('id', otherIds)

      const matchIds = matches.map(m => m.id)
      const { data: allMsgs } = await supabase
        .from('messages')
        .select('match_id, text, image_url, created_at, sender_id')
        .in('match_id', matchIds)
        .order('created_at', { ascending: false })

      if (cancelled) return

      const lastMsgByMatch: Record<string, LastMessage> = {}
      const unreadByMatch: Record<string, number> = {}
      if (allMsgs) {
        for (const msg of allMsgs) {
          if (!lastMsgByMatch[msg.match_id]) lastMsgByMatch[msg.match_id] = msg
          if (msg.sender_id !== uid) unreadByMatch[msg.match_id] = (unreadByMatch[msg.match_id] || 0) + 1
        }
      }

      const list: Conversation[] = matches.map(m => {
        const otherId = m.user1_id === uid ? m.user2_id : m.user1_id
        const p = (pData ?? []).find((p: { id: string }) => p.id === otherId) as { id: string; name: string; photos: string[] } | undefined
        if (!p) return null
        return {
          matchId: m.id,
          profile: { id: p.id, name: p.name, photos: p.photos || [] },
          lastMessage: lastMsgByMatch[m.id] || null,
          unreadCount: unreadByMatch?.[m.id] ?? 0,
          isTyping: false, isFavorite: false, isArchived: false, isPinned: false,
        }
      }).filter(Boolean) as Conversation[]

      setConvs(list)

      const ids = list.map(c => c.matchId)
      if (ids.length > 0) {
        const typingCh = supabase.channel('msgs-typing')
        chRef.current.push(typingCh)
        typingCh.on('broadcast', { event: 'typing' }, (payload: { payload?: { matchId?: string } }) => {
          if (payload.payload?.matchId && ids.includes(payload.payload.matchId)) {
            setConvs(prev => prev.map(c => c.matchId === payload.payload!.matchId ? { ...c, isTyping: true } : c))
            setTimeout(() => setConvs(prev => prev.map(c => c.matchId === payload.payload!.matchId ? { ...c, isTyping: false } : c)), 3000)
          }
        })
        typingCh.subscribe()

        const presenceCh = supabase.channel('msgs-online')
        chRef.current.push(presenceCh)
        presenceCh.on('presence', { event: 'sync' }, () => {
          const state = presenceCh.presenceState()
          const online = new Set(Object.keys(state))
          setConvs(prev => prev.map(c => ({ ...c, profile: { ...c.profile, online: online.has(c.profile.id) } })))
        })
        presenceCh.subscribe()
      }

      if (!cancelled) setLoading(false)
    }).catch(() => setLoading(false))

    return () => {
      cancelled = true
      chRef.current.forEach(ch => supabase.removeChannel(ch))
      chRef.current = []
    }
  }, [])

  const onlineMap = useMemo(() =>
    Object.fromEntries(convs.map(c => [c.profile.id, (c.profile as { online?: boolean }).online ?? false])),
  [convs])

  const filtered = useMemo(() => {
    let result = [...convs]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c => c.profile.name.toLowerCase().includes(q))
    }
    if (filter === 'unread') result = result.filter(c => c.unreadCount > 0)
    else if (filter === 'favorites') result = result.filter(c => c.isFavorite)
    else if (filter === 'archived') result = result.filter(c => c.isArchived)
    result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      const aTime = a.lastMessage?.created_at || a.matchId
      const bTime = b.lastMessage?.created_at || b.matchId
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })
    return result
  }, [convs, searchQuery, filter])

  const togglePinned = (matchId: string) => setConvs(prev => prev.map(c => c.matchId === matchId ? { ...c, isPinned: !c.isPinned } : c))
  const toggleFavorite = (matchId: string) => setConvs(prev => prev.map(c => c.matchId === matchId ? { ...c, isFavorite: !c.isFavorite } : c))
  const toggleArchive = (matchId: string) => setConvs(prev => prev.map(c => c.matchId === matchId ? { ...c, isArchived: !c.isArchived } : c))

  if (loading) return <MatchesSkeleton />

  return (
    <div className="flex-1 flex flex-col bg-transparent">
      <header className="px-5 pt-6 pb-3">
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-secondary text-sm mt-0.5">Tes conversations</p>
      </header>

      <div className="px-4 pb-2">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher une conversation..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface text-theme text-sm border border-theme outline-none focus:border-primary/30 transition-colors placeholder:text-muted" />
        </div>
      </div>

      <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
        {(['all', 'unread', 'favorites', 'archived'] as FilterMode[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${filter === f ? 'bg-primary text-theme' : 'bg-surface text-secondary border border-theme'}`}>
            {f === 'all' ? 'Toutes' : f === 'unread' ? 'Non lues' : f === 'favorites' ? 'Favoris' : 'Archivées'}
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
              {searchQuery ? 'Aucun résultat' : filter === 'archived' ? 'Aucune conversation archivée' : filter === 'favorites' ? 'Aucun favori' : filter === 'unread' ? 'Tout est lu !' : 'Pas encore de messages'}
            </h3>
            <p className="text-secondary text-sm mt-1 max-w-xs">
              {searchQuery ? 'Essaie un autre terme.' : filter === 'all' ? 'Match avec quelqu\'un pour commencer à discuter.' : ''}
            </p>
            {filter === 'all' && !searchQuery && (
              <Link href="/discover" className="inline-block mt-6 px-8 py-3 rounded-full text-theme font-semibold text-sm transition-all active:scale-95"
                style={{ background: 'var(--primary)' }}>
                Découvrir
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map(c => (
              <ConversationRow key={c.matchId} conv={c} myId={myId} isOnline={onlineMap[c.profile.id] || false}
                menuOpen={menuOpen} onMenuOpen={setMenuOpen}
                onToggleFavorite={toggleFavorite} onToggleArchive={toggleArchive} onTogglePinned={togglePinned} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ConversationRow({ conv, myId, isOnline, menuOpen, onMenuOpen, onToggleFavorite, onToggleArchive, onTogglePinned }: {
  conv: Conversation; myId: string; isOnline: boolean
  menuOpen: string | null; onMenuOpen: (id: string | null) => void
  onToggleFavorite: (id: string) => void; onToggleArchive: (id: string) => void; onTogglePinned: (id: string) => void
}) {
  const p = conv.profile
  const lastMsg = conv.lastMessage
  const isOwn = lastMsg?.sender_id === myId
  const previewText = conv.isTyping
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
          <span className="font-semibold text-sm truncate flex items-center gap-1">
            {conv.isPinned && <Pin size={10} className="text-primary shrink-0" />}
            {p.name}
          </span>
          {conv.isFavorite && <Star size={10} className="text-warning fill-[var(--warning)] shrink-0" />}
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
          className="p-2.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-hover">
          <MoreHorizontal size={16} className="text-muted" />
        </button>
        {menuOpen === conv.matchId && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => onMenuOpen(null)} />
            <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-surface rounded-xl border border-theme shadow-xl overflow-hidden py-1">
              <button onClick={e => { e.preventDefault(); onTogglePinned(conv.matchId); onMenuOpen(null) }}
                className="w-full px-4 py-2.5 text-sm text-left hover:bg-hover flex items-center gap-2.5">
                <Pin size={14} className={conv.isPinned ? 'text-primary' : 'text-secondary'} />
                {conv.isPinned ? 'Désépingler' : 'Épingler'}
              </button>
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
            </div>
          </>
        )}
      </div>
    </Link>
  )
}
