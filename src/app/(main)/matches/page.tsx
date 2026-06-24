'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { type Profile } from '@/lib/api'

interface Conversation {
  matchId: string
  profile: Profile
}

export default function MatchesPage() {
  const [convs, setConvs] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: matches } = await supabase.from('matches').select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      if (!matches) { setLoading(false); return }

      const list: Conversation[] = []
      for (const m of matches) {
        const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id
        const { data: p } = await supabase.from('profiles').select('*').eq('id', otherId).single()
        if (p) list.push({ matchId: m.id, profile: p as Profile })
      }
      setConvs(list)
      setLoading(false)
    })()
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#FF3B5C', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-5 pt-4 pb-3">
        <h2 className="text-2xl font-bold">Matchs</h2>
        <p className="text-zinc-500 text-sm">{convs.length} conversation{convs.length > 1 ? 's' : ''}</p>
      </header>

      <div className="flex-1 px-4 pb-4 space-y-2">
        {convs.length === 0 ? (
          <div className="text-center mt-20">
            <Heart size={64} className="text-zinc-200 mx-auto mb-4" />
            <p className="font-semibold">Pas encore de matchs</p>
            <p className="text-zinc-400 text-sm mt-1">Continue à découvrir des profils !</p>
          </div>
        ) : convs.map((c) => (
          <Link key={c.matchId} href={`/chat/${c.matchId}`}
            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-zinc-100 hover:shadow-sm transition">
            <Image src={c.profile.photos?.[0] ?? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'} alt={c.profile.name} width={56} height={56}
              className="rounded-full object-cover bg-zinc-200" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{c.profile.name}</p>
              <p className="text-sm text-zinc-400 truncate">Dites bonjour ! 👋</p>
            </div>
            <MessageCircle size={20} className="text-zinc-300" />
          </Link>
        ))}
      </div>
    </div>
  )
}
