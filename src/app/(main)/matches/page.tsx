'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MessageCircle, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { getReceivedFlirts, type Profile } from '@/lib/api'

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

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [{ data: matches }, { data: flirtData }] = await Promise.all([
        supabase.from('matches').select('*').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
        getReceivedFlirts(),
      ])
      if (flirtData) setFlirts(flirtData as Flirt[])

      const list: Conversation[] = []
      if (matches) {
        for (const m of matches) {
          const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id
          const { data: p } = await supabase.from('profiles').select('*').eq('id', otherId).single()
          if (p) list.push({ matchId: m.id, profile: p as Profile })
        }
      }
      setConvs(list)
      setLoading(false)
    })()
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#D92D4A', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex-1 flex flex-col">
      <header className="px-5 pt-4 pb-3">
        <h2 className="text-2xl font-bold">Matchs</h2>
        <p className="text-[#9E9488] text-sm">{convs.length} conversation{convs.length > 1 ? 's' : ''}</p>
      </header>

      <div className="flex-1 px-4 pb-4 space-y-2 overflow-y-auto">
        {flirts.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[#9E9488] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Eye size={14} className="text-[#D92D4A]" /> Œillades reçues
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {flirts.map((f) => (
                <div key={f.sender_id} className="flex flex-col items-center gap-1 min-w-[72px]">
                  <div className="w-14 h-14 rounded-full bg-[#262628] overflow-hidden border border-[#2A2826]">
                    {f.sender?.photos?.[0] ? (
                      <Image src={f.sender.photos[0]} alt={f.sender.name} width={56} height={56} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#6B6258] text-lg">?</div>
                    )}
                  </div>
                  <p className="text-xs text-[#9E9488] truncate max-w-[72px]">{f.sender?.name ?? 'Inconnu'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {convs.length === 0 ? (
          <div className="text-center mt-20">
            <Heart size={64} className="text-[#4A4238] mx-auto mb-4" />
            <p className="font-semibold">Pas encore de matchs</p>
            <p className="text-[#6B6258] text-sm mt-1">Continue à découvrir des profils !</p>
          </div>
        ) : convs.map((c) => (
          <Link key={c.matchId} href={`/chat/${c.matchId}`}
            className="flex items-center gap-3 p-3 bg-[#1C1C1E] rounded-xl border border-[#2A2826] hover:shadow-sm shadow-black/20 transition">
            <Image src={c.profile.photos?.[0] ?? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'} alt={c.profile.name} width={56} height={56}
              className="rounded-full object-cover bg-[#262628]" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{c.profile.name}</p>
              <p className="text-sm text-[#6B6258] truncate">Dites bonjour ! 👋</p>
            </div>
            <MessageCircle size={20} className="text-[#5A5248]" />
          </Link>
        ))}
      </div>
    </div>
  )
}
