'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { getMessages, sendMessage, sendPhotoMessage, unmatchUser, type Message } from '@/lib/api'
import type { RealtimePostgresChangesPayload } from '@supabase/realtime-js'
import { Send, Camera, X } from 'lucide-react'

export default function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [otherProfile, setOtherProfile] = useState<{ id: string; name: string; last_seen: string } | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let profileChannel: ReturnType<typeof supabase.channel> | undefined

    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: match } = await supabase.from('matches').select('*').eq('id', id).single()
      if (!match) { setLoading(false); return }
      const otherId = match.user1_id === user.id ? match.user2_id : match.user1_id

      const { data: other } = await supabase.from('profiles').select('id, name, last_seen').eq('id', otherId).single()
      if (other) setOtherProfile(other as { id: string; name: string; last_seen: string })

      const { data } = await getMessages(id)
      if (data) setMessages(data)
      setLoading(false)

      profileChannel = supabase
        .channel(`profile:${otherId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${otherId}` }, (payload) => {
          const p = payload.new as Record<string, unknown>
          setOtherProfile((prev) => prev ? { ...prev, last_seen: p.last_seen as string } : null)
        })
        .subscribe()
    })()

    const channel = supabase
      .channel(`messages:${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `match_id=eq.${id}`,
      }, (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) =>
        setMessages((prev) => [...prev, payload.new as Message]))
      .subscribe()

    return () => {
      channel.unsubscribe()
      profileChannel?.unsubscribe()
    }
  }, [id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t) }, [])

  const handleSend = async () => {
    if (!text.trim()) return
    const msg = text.trim()
    setText('')
    await sendMessage(id, msg)
  }

  const handlePhoto = () => fileRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await sendPhotoMessage(id, file)
    e.target.value = ''
  }

  const handleUnmatch = async () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce match ?')) {
      await unmatchUser(id)
      router.push('/matches')
    }
  }

  const formatLastSeen = (lastSeen: string) => {
    const diff = now - new Date(lastSeen).getTime()
    if (diff < 60000) return 'En ligne'
    const minutes = Math.floor(diff / 60000)
    if (minutes < 60) return `vu il y a ${minutes} min`
    const hours = Math.floor(minutes / 60)
    return `vu il y a ${hours} h`
  }

  const isOnline = otherProfile?.last_seen && (now - new Date(otherProfile.last_seen).getTime() < 60000)

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-[#1C1C1E]">
      <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#D92D4A', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex-1 flex flex-col bg-[#1C1C1E] max-w-lg mx-auto w-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2826]">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-[#4A4238]'}`} />
          <div>
            <p className="font-semibold text-sm">{otherProfile?.name ?? 'Utilisateur'}</p>
            {otherProfile?.last_seen && !isOnline && (
              <p className="text-xs text-[#6B6258]">{formatLastSeen(otherProfile.last_seen)}</p>
            )}
            {isOnline && <p className="text-xs text-green-500">En ligne</p>}
          </div>
        </div>
        <button onClick={handleUnmatch} className="p-2.5">
          <X size={18} className="text-[#6B6258]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map((m) => (
          m.image_url ? (
            <div key={m.id} className="max-w-[75%] rounded-2xl overflow-hidden bg-[#262628]">
              <Image src={m.image_url} alt="Photo" width={300} height={400} className="w-full object-cover" />
            </div>
          ) : (
            <div key={m.id} className="max-w-[75%] px-4 py-2.5 rounded-2xl bg-[#262628] self-start">
              <p className="text-sm">{m.text}</p>
            </div>
          )
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-[#2A2826]">
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        <button onClick={handlePhoto} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[#1A1A1C]">
          <Camera size={16} className="text-[#9E9488]" />
        </button>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Écris un message..." className="flex-1 px-4 py-2.5 rounded-full bg-[#1A1A1C] text-sm outline-none" />
        <button onClick={handleSend} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: '#D92D4A' }}>
          <Send size={16} className="text-white" />
        </button>
      </div>
    </div>
  )
}
