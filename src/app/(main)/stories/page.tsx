'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Plus, Trash2, Lock } from 'lucide-react'
import { getActiveStories, uploadStory, deleteStory, checkPremium } from '@/lib/api'
import { useToast } from '@/components/Toast'

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
  const [now, setNow] = useState(0)
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getActiveStories().then(({ data }) => {
      if (data) setStories(data as Story[])
    }).catch(() => {}).finally(() => setLoading(false))
    checkPremium().then(setIsPremium).catch(() => {})
    const initTimer = setTimeout(() => setNow(Date.now()), 0)
    const t = setInterval(() => setNow(Date.now()), 60000)
    return () => { clearInterval(t); clearTimeout(initTimer) }
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    const result = await uploadStory(f)
    if (result.error) { toast(result.error, 'error'); setUploading(false); return }
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

  if (loading) return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button onClick={() => router.back()} aria-label="Retour" className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Stories</h2>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#D92D4A', borderTopColor: 'transparent' }} />
      </div>
    </div>
  )

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button onClick={() => router.back()} aria-label="Retour" className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Stories</h2>
        <div className="flex-1" />
        {isPremium ? (
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 hover:shadow-[0_0_15px_rgba(217,45,74,0.3)]" style={{ background: '#D92D4A' }}>
            <Plus size={18} />
          </button>
        ) : (
          <button onClick={() => { toast('Les stories sont réservées aux membres Premium. Passe à Premium pour publier.', 'warning'); router.push('/settings') }} title="Premium requis"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#262628] hover:bg-[#2A2826] transition-all active:scale-90">
            <Lock size={16} className="text-[#6B6258]" />
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleUpload} className="hidden" />
      </header>
      <div className="flex-1 px-4 pb-8 overflow-y-auto">
        {stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-up">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D92D4A]/10 to-transparent mx-auto mb-5 flex items-center justify-center border border-[#D92D4A]/10">
              <span className="text-3xl opacity-40">📸</span>
            </div>
            <p className="text-lg font-semibold">Aucune story</p>
            <p className="text-[#6B6258] text-sm mt-1 max-w-xs leading-relaxed">Ajoute une photo qui disparaîtra dans 24h.</p>
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
