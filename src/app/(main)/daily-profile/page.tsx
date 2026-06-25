'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Star } from 'lucide-react'
import { getDailyProfile, checkForMatch, createSwipe, type Profile } from '@/lib/api'
import Image from 'next/image'

export default function DailyProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [liking, setLiking] = useState(false)

  useEffect(() => {
    getDailyProfile().then(({ data }) => {
      if (data) setProfile(data)
    })
  }, [])

  const handleLike = async () => {
    if (!profile) return
    setLiking(true)
    await createSwipe(profile.id, 'like')
    const { isMatch } = await checkForMatch(profile.id)
    if (isMatch) alert('C\'est un match ! 🔥')
    setProfile(null)
    setLiking(false)
  }

  if (!profile) return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button onClick={() => router.back()} className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Profil du jour</h2>
      </header>
      <div className="flex-1 flex items-center justify-center px-8 text-center">
        <div>
          <Star size={40} className="text-[#6B6258] mx-auto mb-3" />
          <p className="text-[#9E9488] text-sm">Aucun profil disponible aujourd&rsquo;hui</p>
          <p className="text-[#6B6258] text-xs mt-1">Reviens demain !</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button onClick={() => router.back()} className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Profil du jour</h2>
        <Star size={18} className="text-[#EAB308]" />
      </header>
      <div className="flex-1 px-4 pb-8 overflow-y-auto">
        <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-[#1C1C1E] mb-4 relative">
          {profile.photos?.[0] ? (
            <Image src={profile.photos[0]} alt={profile.name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#6B6258] text-4xl">?</div>
          )}
        </div>
        <h2 className="text-xl font-bold">{profile.name}, {profile.age}</h2>
        {profile.bio && <p className="text-sm text-[#9E9488] mt-1">{profile.bio}</p>}
        {profile.interests?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {profile.interests.map((i: string) => (
              <span key={i} className="px-3 py-1 rounded-full bg-[#1C1C1E] text-xs text-[#9E9488] border border-[#2A2826]">{i}</span>
            ))}
          </div>
        )}
        <button onClick={handleLike} disabled={liking}
          className="w-full mt-6 py-3.5 rounded-full font-semibold text-white disabled:opacity-50" style={{ background: '#D92D4A' }}>
          {liking ? 'Envoi...' : 'Like 💕'}
        </button>
      </div>
    </div>
  )
}
