'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Plus, Trash2, Lock } from 'lucide-react'
import { getActiveStories, uploadStory, deleteStory, checkPremium } from '@/lib/api'

interface Story {
  id: string
  user_id: string
  media_url: string
  type: string
  created_at: string
  expires_at: string
  profile: { name: string; photos: string[]; is_verified: boolean } | null
}

export default function StoriesPage() {
  const router = useRouter()
  const [stories, setStories] = useState<Story[]>([])
  const [uploading, setUploading] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [isPremium, setIsPremium] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getActiveStories().then(({ data }) => {
      if (data) setStories(data as Story[])
    })
    checkPremium().then(setIsPremium)
    const t = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    await uploadStory(f)
    setUploading(false)
    getActiveStories().then(({ data }) => {
      if (data) setStories(data as Story[])
    })
  }

  const handleDelete = async (id: string) => {
    await deleteStory(id)
    getActiveStories().then(({ data }) => {
      if (data) setStories(data as Story[])
    })
  }

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button onClick={() => router.back()} className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Stories</h2>
        <div className="flex-1" />
        {isPremium ? (
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#D92D4A' }}>
            <Plus size={18} />
          </button>
        ) : (
          <button onClick={() => router.push('/settings')} title="Premium requis"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#262628]">
            <Lock size={16} className="text-[#6B6258]" />
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleUpload} className="hidden" />
      </header>
      <div className="flex-1 px-4 pb-8 overflow-y-auto">
        {stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-[#9E9488] text-sm">Aucune story pour le moment</p>
            <p className="text-[#6B6258] text-xs mt-1">Ajoute une photo ou vidéo qui disparaîtra dans 24h</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {stories.map(s => (
              <div key={s.id} className="relative aspect-[9/16] rounded-xl overflow-hidden bg-[#1C1C1E]">
                {s.media_url && <Image src={s.media_url} alt="story" width={200} height={355} className="w-full h-full object-cover" />}
                <button onClick={() => handleDelete(s.id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
                  <Trash2 size={14} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-[10px] text-white/70">Il y a {Math.floor((now - new Date(s.created_at).getTime()) / 3600000)}h</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
