'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { getMessages, sendMessage, sendPhotoMessage, unmatchUser, getIcebreakers, addReaction, removeReaction, uploadAudio, sendAudioMessage, toggleEphemeral, startCall, endCall, markAsRead, getPlaylist, addPlaylistItem, removePlaylistItem, getIcebreakerSuggestion, type Message } from '@/lib/api'
import type { RealtimePostgresChangesPayload } from '@supabase/realtime-js'
import { Send, Camera, X, Mic, Play, Square, Video, Music, PhoneOff, ChevronDown } from 'lucide-react'
import { useConfirm } from '@/components/ConfirmDialog'

interface Icebreaker {
  id: string
  question: string
  category: string | null
}

interface Reaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
  profile: { name: string } | null
}

function AudioPlayer({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onLoaded = () => setDuration(a.duration)
    const onTime = () => setCurrentTime(a.currentTime)
    const onEnd = () => setPlaying(false)
    a.addEventListener('loadedmetadata', onLoaded)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('ended', onEnd)
    return () => { a.removeEventListener('loadedmetadata', onLoaded); a.removeEventListener('timeupdate', onTime); a.removeEventListener('ended', onEnd) }
  }, [])

  return (
    <div className="flex items-center gap-2">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Lecture'} className="w-8 h-8 rounded-full bg-[#D92D4A]/20 flex items-center justify-center">
        {playing ? <Square size={12} /> : <Play size={12} fill="currentColor" />}
      </button>
      <span className="text-xs text-[#9E9488] tabular-nums">
        {Math.floor(currentTime)}s / {Math.floor(duration)}s
      </span>
      <div className="flex-1 h-1 bg-[#2A2826] rounded-full overflow-hidden">
        <div className="h-full bg-[#D92D4A] transition-all" style={{ width: duration ? `${(currentTime / duration) * 100}%` : 0 }} />
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [otherProfile, setOtherProfile] = useState<{ id: string; name: string; last_seen: string } | null>(null)
  const [now, setNow] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [typingUserId, setTypingUserId] = useState<string | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>(undefined)
  const lastTypingBroadcast = useRef(0)
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const { confirm } = useConfirm()
  const [isSelfChat, setIsSelfChat] = useState(false)
  const [icebreakers, setIcebreakers] = useState<Icebreaker[]>([])
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({})
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null)
  const [match, setMatch] = useState<{ ephemeral?: boolean } | null>(null)
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [showEphemeralOpts, setShowEphemeralOpts] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const [callStatus, setCallStatus] = useState<string | null>(null)
  const [callId, setCallId] = useState<string | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const [showPlaylist, setShowPlaylist] = useState(false)
  const [playlist, setPlaylist] = useState<Array<{ id: string; title: string; artist?: string; url?: string }>>([])
  const [newSongTitle, setNewSongTitle] = useState('')
  const [newSongUrl, setNewSongUrl] = useState('')
  const [viewOnce, setViewOnce] = useState(false)
  const [revealedOnce, setRevealedOnce] = useState<Record<string, boolean>>({})
  const [otherOnline, setOtherOnline] = useState(false)

  const loadPlaylist = async () => {
    const { data } = await getPlaylist(id)
    if (data) setPlaylist(data)
  }

  const loadMessages = useCallback(async () => {
    const { data } = await getMessages(id)
    if (data) {
      setMessages(data)
      const msgIds = data.map(m => m.id).filter(Boolean)
      if (msgIds.length > 0) {
        const { data: allReactions } = await supabase.from('message_reactions').select('*').in('message_id', msgIds)
        if (allReactions) {
          const r: Record<string, Reaction[]> = {}
          for (const react of allReactions as Reaction[]) {
            if (!r[react.message_id]) r[react.message_id] = []
            r[react.message_id].push(react)
          }
          setReactions(r)
        }
      }
    }
  }, [id])

  const handleIcebreaker = async (text: string) => {
    await sendMessage(id, text)
    loadMessages()
  }

  const handleAIIcebreaker = async () => {
    if (!otherProfile) return
    const { data, error } = await getIcebreakerSuggestion(otherProfile.id)
    if (data && !error) {
      setAiSuggestion(data as string)
    }
  }

  const handleReact = async (messageId: string, emoji: string) => {
    const existing = reactions[messageId]?.find(r => r.user_id === currentUser?.id)
    if (existing && existing.emoji === emoji) {
      await removeReaction(messageId)
    } else {
      await addReaction(messageId, emoji)
    }
    setReactingMessageId(null)
    loadMessages()
  }

  const handleStartCall = async () => {
    if (!otherProfile?.id) return
    const { data, error } = await startCall(id, otherProfile.id)
    if (error || !data) return
    setCallId(data[0]?.id ?? null)
    setCallStatus('ringing')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
      peerConnectionRef.current = pc
      stream.getTracks().forEach(t => pc.addTrack(t, stream))
      pc.ontrack = (e) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]
      }
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      const signalCh = supabase.channel(`call:${id}`)
      signalCh.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          signalCh.send({ type: 'broadcast', event: 'offer', payload: { offer } })
          setTimeout(() => supabase.removeChannel(signalCh), 2000)
        }
      })
      setCallStatus('connected')
    } catch (e) {
      console.error('Call failed:', e)
      setCallStatus(null)
    }
  }

  const handleEndCall = async () => {
    if (callId) { const r = await endCall(callId); void r }
    peerConnectionRef.current?.close()
    const stream = localVideoRef.current?.srcObject as MediaStream | null
    stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop())
    setCallStatus(null)
    setCallId(null)
  }

  const handleAddPlaylist = async () => {
    if (!newSongTitle) return
    await addPlaylistItem(id, newSongTitle, undefined, newSongUrl || undefined)
    setNewSongTitle('')
    setNewSongUrl('')
    loadPlaylist()
  }

  const handleRemovePlaylist = async (itemId: string) => {
    await removePlaylistItem(itemId)
    loadPlaylist()
  }

  useEffect(() => {
    let profileChannel: ReturnType<typeof supabase.channel> | undefined
    let presenceChannel: ReturnType<typeof supabase.channel> | undefined

    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setCurrentUser(user)

      const { data: matchData } = await supabase.from('matches').select('*').eq('id', id).single()
      if (!matchData) { setLoading(false); return }
      setMatch(matchData)
      const otherId = matchData.user1_id === user.id ? matchData.user2_id : matchData.user1_id

      if (otherId === user.id) { setIsSelfChat(true); setLoading(false); return }

      const { data: other } = await supabase.from('profiles').select('id, name, last_seen').eq('id', otherId).single()
      if (other) setOtherProfile(other as { id: string; name: string; last_seen: string })

      await loadMessages()
      setLoading(false)

      const presenceCh = supabase.channel(`presence:${otherId}`, {
        config: { presence: { key: otherId } },
      })
      presenceCh.on('presence', { event: 'sync' }, () => {
        setOtherOnline(Object.keys(presenceCh.presenceState()).length > 0)
      })
      presenceCh.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceCh.track({ online: true })
        }
      })
      presenceChannel = presenceCh

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
      }, (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const newMsg = payload.new as Message
        setMessages((prev) => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
      profileChannel?.unsubscribe()
      presenceChannel?.unsubscribe()
    }
  }, [id, loadMessages])

  useEffect(() => {
    getIcebreakers().then(({ data }) => {
      if (data) setIcebreakers(data.slice(0, 5))
    })
  }, [])

  useEffect(() => {
    let typingSentChannel: ReturnType<typeof supabase.channel> | undefined
    ;(async () => {
      typingSentChannel = supabase.channel(`typing:match-${id}`)
      typingSentChannel.subscribe()
    })()
    
    const typingRecvChannel = supabase.channel(`typing:match-${id}`)
    typingRecvChannel.on('broadcast', { event: 'typing' }, (payload: { payload: { userId: string } }) => {
      if (payload.payload.userId !== currentUser?.id) {
        setTypingUserId(payload.payload.userId)
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => setTypingUserId(null), 2000)
      }
    })
    typingRecvChannel.subscribe()

    return () => {
      if (typingSentChannel) supabase.removeChannel(typingSentChannel)
      supabase.removeChannel(typingRecvChannel)
      clearTimeout(typingTimeoutRef.current)
    }
  }, [id, currentUser?.id])

  useEffect(() => {
    if (isNearBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isNearBottom])
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    const el = bottomRef.current
    if (!el) return () => clearInterval(t)
    const obs = new IntersectionObserver(([entry]) => setIsNearBottom(entry.isIntersecting), { rootMargin: '100px' })
    obs.observe(el)
    return () => { clearInterval(t); obs.disconnect() }
  }, [])

  useEffect(() => {
    const channel = supabase.channel(`call:${id}`)
    channel.on('broadcast', { event: 'offer' }, (payload: { payload: { offer: RTCSessionDescriptionInit } }) => {
      const handleOffer = async () => {
        setCallStatus('connected')
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (localVideoRef.current) localVideoRef.current.srcObject = stream
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
        peerConnectionRef.current = pc
        stream.getTracks().forEach(t => pc.addTrack(t, stream))
        pc.ontrack = (e) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0] }
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            channel.send({ type: 'broadcast', event: 'ice-candidate', payload: { candidate: e.candidate } })
          }
        }
        await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        channel.send({ type: 'broadcast', event: 'answer', payload: { answer } })
      }
      handleOffer()
    })
    channel.on('broadcast', { event: 'ice-candidate' }, async (payload: { payload: { candidate: RTCIceCandidateInit } }) => {
      try {
        await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(payload.payload.candidate))
      } catch {}
    })
    channel.subscribe()

    const videoEl = localVideoRef.current
    return () => {
      supabase.removeChannel(channel)
      peerConnectionRef.current?.close()
      const stream = videoEl?.srcObject as MediaStream | null
      stream?.getTracks().forEach(t => t.stop())
      if (videoEl) videoEl.srcObject = null
    }
  }, [id])

  useEffect(() => {
    const t = setTimeout(() => {
      markAsRead(id)
    }, 1000)
    return () => clearTimeout(t)
  }, [id, messages.length])

  const broadcastTyping = useCallback(() => {
    const now = Date.now()
    if (now - lastTypingBroadcast.current > 300) {
      lastTypingBroadcast.current = now
      const ch = supabase.channel(`typing:match-${id}`)
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          ch.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUser?.id, matchId: id } })
          setTimeout(() => supabase.removeChannel(ch), 1000)
        }
      })
    }
  }, [id, currentUser?.id])

  const handleSend = async () => {
    if (!text.trim()) return
    const msg = text.trim()
    setText('')
    try { navigator.vibrate(5) } catch {}
    await sendMessage(id, msg)
  }

  const handlePhoto = () => fileRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (viewOnce) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const ext = file.name.split('.').pop() ?? 'jpg'
      const fileName = `chat/${id}/${Date.now()}_${user.id}_once.${ext}`
      const { error: uploadError } = await supabase.storage.from('chat_photos').upload(fileName, file)
      if (uploadError) return
      const { data: urlData } = supabase.storage.from('chat_photos').getPublicUrl(fileName)
      await supabase.from('messages').insert({
        match_id: id, sender_id: user.id, image_url: urlData.publicUrl, view_once: true,
      })
    } else {
      await sendPhotoMessage(id, file)
    }
    e.target.value = ''
    setViewOnce(false)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      const chunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' })
        const { url } = await uploadAudio(file, id)
        if (url) await sendAudioMessage(id, url)
        stream.getTracks().forEach(t => t.stop())
      }

      mediaRecorder.start()
      setRecording(true)
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(t => {
          const next = t + 1
          if (next >= 60) setTimeout(stopRecording, 0)
          return next
        })
      }, 1000)
    } catch {}
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
  }

  const handleUnmatch = async () => {
    if (await confirm('Êtes-vous sûr de vouloir supprimer ce match ?')) {
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

  const isOnline = otherOnline || (otherProfile?.last_seen && (now - new Date(otherProfile.last_seen).getTime() < 60000))

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-transparent">
      <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#D92D4A', borderTopColor: 'transparent' }} />
    </div>
  )

  if (isSelfChat) return (
    <div className="flex-1 flex items-center justify-center bg-transparent px-6">
      <div className="glass-card rounded-3xl p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D92D4A]/20 to-transparent mx-auto mb-4 flex items-center justify-center">
          <span className="text-3xl">🙅</span>
        </div>
        <h2 className="text-xl font-bold mb-1">Chat indisponible</h2>
        <p className="text-[#9E9488] text-sm mb-6">Tu ne peux pas t&rsquo;envoyer des messages à toi-même.</p>
        <button onClick={() => router.push('/matches')}
          className="w-full py-3.5 rounded-full text-white font-semibold transition active:scale-95" style={{ background: '#D92D4A' }}>
          Retour aux matchs
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col w-full relative bg-transparent">

      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-[#4A4238]'}`} />
          </div>
          <div>
            <p className="font-semibold text-sm">{otherProfile?.name || 'Utilisateur'}</p>
            {otherProfile?.last_seen && !isOnline && (
              <p className="text-[10px] text-[#6B6258]">{formatLastSeen(otherProfile.last_seen)}</p>
            )}
            {isOnline && <p className="text-[10px] text-green-400">En ligne</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Playlist" onClick={() => { setShowPlaylist(!showPlaylist); if (!showPlaylist) loadPlaylist() }}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${showPlaylist ? 'bg-[#D92D4A]/20 text-[#D92D4A]' : 'text-[#6B6258] hover:bg-white/5'}`}>
            <Music size={16} />
          </button>
          <button type="button" onClick={() => setShowEphemeralOpts(!showEphemeralOpts)}
            className={`text-[10px] px-2.5 py-1 rounded-full transition-all ${match?.ephemeral ? 'bg-[#D92D4A]/20 text-[#D92D4A] border border-[#D92D4A]/20' : 'text-[#6B6258] border border-transparent hover:border-white/10'}`}>
            {match?.ephemeral ? 'Éphémère' : 'Permanent'}
          </button>
          <button type="button" aria-label="Appel vidéo" onClick={handleStartCall} disabled={callStatus === 'ringing' || callStatus === 'connected'}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#6B6258] hover:bg-white/5 disabled:opacity-30 transition-all">
            <Video size={16} />
          </button>
          <button type="button" aria-label="Supprimer le match" onClick={handleUnmatch} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/5 transition-all">
            <X size={16} className="text-[#6B6258]" />
          </button>
        </div>
      </div>

      {callStatus && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col">
          <div className="flex-1 relative bg-zinc-900">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-4 right-4 w-24 h-36 rounded-lg object-cover bg-zinc-800 border-2 border-white/20" />
          </div>
          <div className="px-8 py-6 flex items-center justify-center gap-6">
            <p className="text-sm text-white/60 absolute left-8">
              {callStatus === 'ringing' ? 'Appel en cours...' : callStatus === 'connected' ? 'En communication' : ''}
            </p>
            <button type="button" aria-label="Raccrocher" onClick={handleEndCall}
              className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center">
              <PhoneOff size={24} fill="white" />
            </button>
          </div>
        </div>
      )}

      {showEphemeralOpts && (
        <div className="px-4 py-2 bg-[#1C1C1E] border-b border-[#2A2826]">
          <p className="text-xs text-[#9E9488] mb-2">Messages éphémères</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => { toggleEphemeral(id, false); setShowEphemeralOpts(false) }}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#262628] text-white">
              Désactivé
            </button>
            <button type="button" onClick={() => { toggleEphemeral(id, true); setShowEphemeralOpts(false) }}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#D92D4A]/20 text-[#D92D4A]">
              Activé (24h)
            </button>
          </div>
          <p className="text-[10px] text-[#6B6258] mt-1">Les messages disparaîtront après 24h</p>
        </div>
      )}

      {showPlaylist && (
        <div className="border-b border-[#2A2826] bg-[#1C1C1E] px-4 py-3 max-h-48 overflow-y-auto">
          <p className="text-xs text-[#9E9488] font-medium mb-2 uppercase tracking-wider">Playlist partagée</p>
          {playlist.length === 0 ? (
            <p className="text-xs text-[#6B6258]">Ajoutez des musiques à votre playlist</p>
          ) : playlist.map(item => (
            <div key={item.id} className="flex items-center justify-between py-1.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{item.title}</p>
                {item.artist && <p className="text-[10px] text-[#6B6258]">{item.artist}</p>}
              </div>
              <button type="button" aria-label="Retirer de la playlist" onClick={() => handleRemovePlaylist(item.id)} className="text-[#6B6258] hover:text-white ml-2">
                <X size={14} />
              </button>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input value={newSongTitle} onChange={e => setNewSongTitle(e.target.value)} placeholder="Titre..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-[#262628] text-xs text-white border border-[#2A2826] outline-none focus:border-[#D92D4A]" />
            <input value={newSongUrl} onChange={e => setNewSongUrl(e.target.value)} placeholder="URL..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-[#262628] text-xs text-white border border-[#2A2826] outline-none focus:border-[#D92D4A]" />
            <button type="button" onClick={handleAddPlaylist}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: '#D92D4A' }}>
              +
            </button>
          </div>
        </div>
      )}

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && icebreakers.length > 0 && (
          <div className="px-4 py-4 animate-fade-up">
            <p className="text-xs text-[#9E9488] mb-3 font-medium uppercase tracking-wider">Pour briser la glace</p>
            <div className="flex flex-wrap gap-2">
              {icebreakers.map((ib, i) => (
                <button type="button" key={i} onClick={() => handleIcebreaker(ib.question)}
                  className="px-4 py-2.5 rounded-full text-sm glass-card border border-[#2A2826] text-[#E8E0D8] hover:border-[#D92D4A]/30 transition-all active:scale-95">
                  {ib.question}
                </button>
              ))}
            </div>
            <button type="button" onClick={handleAIIcebreaker}
              className="mt-2 text-xs px-3 py-1.5 rounded-full bg-[#D92D4A]/10 text-[#D92D4A] border border-[#D92D4A]/20 hover:bg-[#D92D4A]/20 transition">
              Générer une suggestion IA
            </button>
            {aiSuggestion && (
              <div className="mt-2">
                <button type="button" onClick={() => { sendMessage(id, aiSuggestion); setAiSuggestion(null); }}
                  className="px-4 py-2.5 rounded-full text-sm bg-[#D92D4A]/10 border border-[#D92D4A] text-[#D92D4A] hover:bg-[#D92D4A]/20 transition animate-pulse">
                  ✨ {aiSuggestion}
                </button>
              </div>
            )}
          </div>
        )}
        {messages.map((m, i) => {
          const showDateSep = i === 0 || new Date(m.created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString()
          const mDate = new Date(m.created_at).toDateString()
          let dateLabel = ''
          if (showDateSep) {
            const today = new Date(now).toDateString()
            const yesterday = new Date(now - 864e5).toDateString()
            if (mDate === today) dateLabel = 'Aujourd\'hui'
            else if (mDate === yesterday) dateLabel = 'Hier'
            else dateLabel = new Date(m.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
          }
          return (
          <div key={m.id} className="w-full">
            {showDateSep && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-[#2A2826]" />
                <span className="text-[10px] font-medium text-[#6B6258] uppercase tracking-wider">{dateLabel}</span>
                <div className="flex-1 h-px bg-[#2A2826]" />
              </div>
            )}
            {m.audio_url ? (
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${m.sender_id === currentUser?.id ? 'self-end bg-gradient-to-r from-[#D92D4A]/20 to-[#D92D4A]/10 border border-[#D92D4A]/10' : 'glass-card self-start'}`}>
              <AudioPlayer src={m.audio_url} />
            </div>
          ) : m.image_url ? (
            <div className={`max-w-[80%] rounded-2xl overflow-hidden relative ${m.sender_id === currentUser?.id ? 'self-end border border-[#D92D4A]/10' : 'glass-card self-start'}`}>
              {m.view_once && m.sender_id !== currentUser?.id ? (
                <div className="relative">
                  {revealedOnce[m.id] ? (
                    <Image src={m.image_url} alt="Photo" width={300} height={400} className="w-full object-cover" />
                  ) : (
                    <button onClick={() => setRevealedOnce(r => ({ ...r, [m.id]: true }))} className="block w-full">
                      <Image src={m.image_url} alt="Photo à vue unique" width={300} height={400} className="w-full object-cover blur-xl brightness-50" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-xs font-medium bg-black/50 px-3 py-1.5 rounded-full">Appuie pour voir 👁️</span>
                      </div>
                    </button>
                  )}
                </div>
              ) : (
                <Image src={m.image_url} alt="Photo" width={300} height={400} className="w-full object-cover" />
              )}
              {m.sender_id === currentUser?.id && m.view_once && (
                <span className="absolute top-1 right-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded-full">👁️ 1x</span>
              )}
            </div>
              ) : (
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl animate-fade-up ${m.sender_id === currentUser?.id
                  ? 'self-end bg-gradient-to-r from-[#D92D4A]/20 to-[#D92D4A]/10 border border-[#D92D4A]/10'
                  : 'glass-card self-start'
                }`}>
                  <p className="text-sm leading-relaxed">{m.text}</p>
                  {m.sender_id === currentUser?.id && (
                    <span className="text-[10px] ml-1">
                      {m.view_once && <span className="text-[#D92D4A] mr-0.5">👁️</span>}
                      {m.read_at ? (
                    <span className="text-[#D92D4A]">✓✓</span>
                  ) : (
                    <span className="text-[#6B6258]">✓</span>
                  )}
                </span>
              )}
              <div className="flex items-center gap-1 mt-1.5">
                {reactions[m.id]?.length > 0 && (
                  <div className="flex gap-0.5">
                    {reactions[m.id].map((r: Reaction, i: number) => (
                      <span key={i} className="text-sm">{r.emoji}</span>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => setReactingMessageId(reactingMessageId === m.id ? null : m.id)}
                  className="text-[#6B6258] hover:text-white text-xs ml-1 transition">
                  +
                </button>
              </div>
              {reactingMessageId === m.id && (
                <div className="flex gap-1.5 mt-1.5">
                  {['❤️', '😂', '😮', '😢', '🔥', '👍'].map(emoji => (
                    <button type="button" key={emoji} onClick={() => handleReact(m.id, emoji)}
                      className="text-lg hover:scale-125 transition-all active:scale-150">
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}
          </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {!isNearBottom && (
        <button type="button" onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="fixed bottom-24 right-6 w-10 h-10 rounded-full bg-[#D92D4A] shadow-lg shadow-black/40 flex items-center justify-center z-20 animate-scale-in active:scale-90 transition-all">
          <ChevronDown size={20} />
        </button>
      )}

      {typingUserId && (
        <div className="text-xs text-[#9E9488] px-4 py-2 italic animate-pulse flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#9E9488] animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[#9E9488] animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[#9E9488] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          est en train d&rsquo;écrire...
        </div>
      )}

      {recording && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#D92D4A]/10 border-t border-[#D92D4A]/10">
          <div className="w-2.5 h-2.5 rounded-full bg-[#D92D4A] animate-glow" />
          <span className="text-xs text-[#D92D4A] font-medium tabular-nums">
            {String(Math.floor(recordingTime / 60)).padStart(2, '0')}:{String(recordingTime % 60).padStart(2, '0')}
          </span>
          <div className="flex-1 h-1 bg-[#2A2826] rounded-full overflow-hidden max-w-[120px]">
            <div className="h-full bg-[#D92D4A] rounded-full animate-pulse" style={{ width: `${(recordingTime / 60) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2.5 px-4 py-3 border-t border-[#2A2826]/60 bg-[#141414]/80 backdrop-blur-md">
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        <button type="button" aria-label="Photo" onClick={handlePhoto} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 glass-light transition-all hover:border-white/20 active:scale-90">
          <Camera size={16} className="text-[#9E9488]" />
        </button>
        <button type="button" aria-label="Vue unique" onClick={() => setViewOnce(!viewOnce)}
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 ${viewOnce ? 'bg-[#D92D4A]/20 text-[#D92D4A] border border-[#D92D4A]/20' : 'glass-light text-[#6B6258] hover:border-white/20'}`}>
          <span className="text-xs font-bold">1x</span>
        </button>
        <input value={text} onChange={(e) => { setText(e.target.value); broadcastTyping() }} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Écris un message..." className="flex-1 px-4 py-2.5 rounded-full bg-[#1A1A1C]/80 border border-[#2A2826]/50 text-sm outline-none focus:border-[#D92D4A]/30 transition-all" />
        <button type="button" aria-label="Message vocal" onClick={startRecording} disabled={recording}
          className="w-10 h-10 rounded-full flex items-center justify-center text-[#6B6258] hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all active:scale-90">
          <Mic size={18} />
        </button>
        {recording ? (
          <button type="button" aria-label="Arrêter l'enregistrement" onClick={stopRecording}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[#D92D4A] hover:shadow-[0_0_15px_rgba(217,45,74,0.3)] active:scale-90 transition-all">
            <Square size={16} fill="white" />
          </button>
        ) : (
          <button type="button" aria-label="Envoyer" onClick={handleSend} disabled={!text.trim()}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-30 active:scale-90 transition-all"
            style={{ background: '#D92D4A' }}>
            <Send size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
