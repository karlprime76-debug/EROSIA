'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { getMessages, sendMessage, type Message } from '@/lib/api'
import type { RealtimePostgresChangesPayload } from '@supabase/realtime-js'
import { Send } from 'lucide-react'

export default function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await getMessages(id)
      if (data) setMessages(data)
      setLoading(false)
    })()

    const channel = supabase
      .channel(`messages:${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `match_id=eq.${id}`,
      }, (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) =>
        setMessages((prev) => [...prev, payload.new as Message]))
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = async () => {
    if (!text.trim()) return
    const msg = text.trim()
    setText('')
    await sendMessage(id, msg)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-[#1C1C1E]">
      <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#D92D4A', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex-1 flex flex-col bg-[#1C1C1E] max-w-lg mx-auto w-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className="max-w-[75%] px-4 py-2.5 rounded-2xl bg-[#262628] self-start">
            <p className="text-sm">{m.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-2 px-4 py-3 border-t border-[#2A2826]">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Écris un message..." className="flex-1 px-4 py-2.5 rounded-full bg-[#1A1A1C] text-sm outline-none" />
        <button onClick={handleSend} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: '#D92D4A' }}>
          <Send size={16} className="text-white" />
        </button>
      </div>
    </div>
  )
}
