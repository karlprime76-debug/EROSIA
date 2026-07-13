'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { MatchesSkeleton } from '@/components/Skeleton'

interface ConvProfile {
  matchId: string
  profileId: string
  name: string
  photo: string | null
  lastMessage: { text: string | null; created_at: string; sender_id: string } | null
}

export default function MessagesPage() {
  const [convs, setConvs] = useState<ConvProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) { setLoading(false); return }
      setMyId(user.id)

      const { data: matches } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!matches || cancelled) { setLoading(false); return }

      const otherIds = matches.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id)
      const { data: pData } = await supabase
        .from('profiles')
        .select('id, name, photos')
        .in('id', otherIds)

      const matchIds = matches.map(m => m.id)
      const { data: allMsgs } = await supabase
        .from('messages')
        .select('match_id, text, created_at, sender_id')
        .in('match_id', matchIds)
        .order('created_at', { ascending: false })

      if (cancelled) return
      const lastMsgByMatch: Record<string, ConvProfile['lastMessage']> = {}
      if (allMsgs) {
        for (const msg of allMsgs) {
          if (!lastMsgByMatch[msg.match_id]) lastMsgByMatch[msg.match_id] = msg
        }
      }

      const list: ConvProfile[] = []
      for (const m of matches) {
        const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id
        const p = (pData ?? []).find((p: { id: string }) => p.id === otherId) as { id: string; name: string; photos: string[] } | undefined
        if (!p) continue
        list.push({
          matchId: m.id,
          profileId: p.id,
          name: p.name,
          photo: p.photos?.[0] ?? null,
          lastMessage: lastMsgByMatch[m.id] ?? null,
        })
      }

      setConvs(list)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <MatchesSkeleton />

  return (
    <div className="flex-1 flex flex-col bg-transparent">
      <header className="px-5 pt-6 pb-3">
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-secondary text-sm mt-0.5">Tes conversations</p>
      </header>

      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        {convs.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 to-transparent mx-auto mb-4 flex items-center justify-center border border-primary/10">
              <MessageCircle size={28} className="text-primary/40" />
            </div>
            <h3 className="font-semibold text-lg">Pas encore de messages</h3>
            <p className="text-secondary text-sm mt-1 max-w-xs">
              Match avec quelqu&apos;un pour commencer à discuter.
            </p>
            <Link href="/discover" className="inline-block mt-6 px-8 py-3 rounded-full text-theme font-semibold text-sm transition-all active:scale-95"
              style={{ background: 'var(--primary)' }}>
              Découvrir
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {convs.map(c => (
              <Link key={c.matchId} href={`/chat/${c.matchId}`}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface/60 transition-colors group">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-hover shrink-0 ring-2 ring-theme">
                  {c.photo ? (
                    <Image src={c.photo} alt={c.name} width={56} height={56} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-secondary">?</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{c.name}</div>
                  {c.lastMessage ? (
                    <div className="flex items-center gap-2 text-xs text-secondary mt-0.5">
                      <span className="truncate">
                        {c.lastMessage.sender_id === myId && <span className="text-muted">Vous : </span>}
                        {c.lastMessage.text ?? '📷 Photo'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted italic mt-0.5 block">Dites bonjour !</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
