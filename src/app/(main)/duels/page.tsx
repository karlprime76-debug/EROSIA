'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Swords } from 'lucide-react'
import { getDuels, voteDuel } from '@/lib/api'
import { supabase } from '@/lib/supabase/client'
import Image from 'next/image'

export default function DuelsPage() {
  const router = useRouter()
  const [duels, setDuels] = useState<any[]>([])
  const [myId, setMyId] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setMyId(data.user.id)
    })
    getDuels().then(({ data }) => {
      if (data) setDuels(data)
    })
  }, [])

  const hasVoted = (duel: any) => duel.votes?.some((v: any) => v.voter_id === myId)
  const totalVotes = (duel: any) => duel.votes?.length ?? 0
  const votesFor = (duel: any, profileId: string) => duel.votes?.filter((v: any) => v.chosen_id === profileId).length ?? 0

  const handleVote = async (duelId: string, chosenId: string) => {
    await voteDuel(duelId, chosenId)
    getDuels().then(({ data }) => { if (data) setDuels(data) })
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button onClick={() => router.back()} className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Duel</h2>
        <div className="flex-1" />
        <button onClick={() => router.push('/duels/new')}
          className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#D92D4A' }}>
          <Swords size={18} />
        </button>
      </header>
      <div className="flex-1 px-4 pb-8 overflow-y-auto space-y-4">
        {duels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Swords size={40} className="text-[#6B6258] mb-3" />
            <p className="text-[#9E9488] text-sm">Aucun duel pour le moment</p>
          </div>
        ) : duels.map(d => (
          <div key={d.id} className="bg-[#1C1C1E] rounded-xl border border-[#2A2826] p-4">
            <p className="text-xs text-[#6B6258] mb-3">{totalVotes(d)} vote(s)</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-zinc-700 overflow-hidden mb-1">
                  {d.profile_a?.photos?.[0] ? (
                    <Image src={d.profile_a.photos[0]} alt="A" width={64} height={64} className="object-cover w-full h-full" />
                  ) : <div className="w-full h-full flex items-center justify-center text-[#6B6258]">?</div>}
                </div>
                <p className="text-xs font-medium">{d.profile_a?.name}</p>
                <p className="text-[10px] text-[#D92D4A]">{votesFor(d, d.profile_a_id)} votes</p>
                <button onClick={() => handleVote(d.id, d.profile_a_id)} disabled={hasVoted(d)}
                  className="mt-1 px-3 py-1 rounded text-[10px] font-medium bg-[#D92D4A]/10 text-[#D92D4A] disabled:opacity-30">
                  Voter
                </button>
              </div>
              <div className="text-2xl text-[#6B6258]">VS</div>
              <div className="flex-1 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-zinc-700 overflow-hidden mb-1">
                  {d.profile_b?.photos?.[0] ? (
                    <Image src={d.profile_b.photos[0]} alt="B" width={64} height={64} className="object-cover w-full h-full" />
                  ) : <div className="w-full h-full flex items-center justify-center text-[#6B6258]">?</div>}
                </div>
                <p className="text-xs font-medium">{d.profile_b?.name}</p>
                <p className="text-[10px] text-[#D92D4A]">{votesFor(d, d.profile_b_id)} votes</p>
                <button onClick={() => handleVote(d.id, d.profile_b_id)} disabled={hasVoted(d)}
                  className="mt-1 px-3 py-1 rounded text-[10px] font-medium bg-[#D92D4A]/10 text-[#D92D4A] disabled:opacity-30">
                  Voter
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
