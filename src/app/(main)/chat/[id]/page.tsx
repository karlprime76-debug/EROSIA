'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Send, Image as ImageIcon, Mic, Square, Smile, X, MoreHorizontal, UserMinus, Flag, Sparkles, Heart, Swords, BarChart3, ShieldOff } from 'lucide-react'

import { supabase } from '@/lib/supabase/client'
import { getMessages, sendMessage, sendPhotoMessage, markAsRead, getAIIcebreaker, createDuel, getMessageSuggestions } from '@/lib/api'
import { logger } from '@/lib/logger'
import { useToast } from '@/components/Toast'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { OnlineStatus, OnlineBadge } from '@/components/chat/OnlineStatus'
import type { DateSuggestion } from '@/lib/date-suggestions'
import dynamic from 'next/dynamic'
const ConsentDialog = dynamic(() => import('@/components/safety/ConsentDialog'), { ssr: false })
const SafetyReminder = dynamic(() => import('@/components/safety/SafetyReminder'), { ssr: false })
const ReportSheet = dynamic(() => import('@/components/safety/ReportSheet'), { ssr: false })
import { reportUser, blockUser, logConsent } from '@/lib/safety/api'

import { motion, AnimatePresence } from 'motion/react'
import type { ChatMessage } from '@/lib/chat/types'

const EMOJI_LIST = ['❤️', '😂', '😍', '🔥', '😮', '😢', '👍', '👎', '👏', '💀', '✨', '🥰']

export default function ChatPage() {
  const { id: matchId } = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()

  const [myId, setMyId] = useState('')
  const [profile, setProfile] = useState<{ id: string; name: string; photos: string[]; age: number | null; mood: string | null } | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [showEmoji, setShowEmoji] = useState(false)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [showAi, setShowAi] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dateSuggestions, setDateSuggestions] = useState<DateSuggestion[]>([])
  const [loadingDates, setLoadingDates] = useState(false)
  const [otherId, setOtherId] = useState('')
  const [showConsent, setShowConsent] = useState(false)
  const [showSafety, setShowSafety] = useState(false)
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [msgSuggestions, setMsgSuggestions] = useState<string[]>([])
  const [showMsgSugg, setShowMsgSugg] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const suggTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const msgChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
    }, 50)
  }, [])

  const loadMessageSuggestions = useCallback(async () => {
    if (!matchId) return
    clearTimeout(suggTimeoutRef.current)
    const result = await getMessageSuggestions(matchId)
    if (result.suggestions.length > 0) {
      setMsgSuggestions(result.suggestions)
      setShowMsgSugg(true)
    }
  }, [matchId])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setMyId(data.user.id)
      const uid = data.user.id

      const { data: match } = await supabase.from('matches').select('user1_id,user2_id').eq('id', matchId).maybeSingle()
      if (!match || (match.user1_id !== uid && match.user2_id !== uid)) {
        toast('Match introuvable', 'error')
        router.push('/matches')
        return
      }

      const oId = match.user1_id === uid ? match.user2_id : match.user1_id
      setOtherId(oId)
      const { data: p } = await supabase.from('profiles').select('id,name,photos,age,mood').eq('id', oId).single()
      if (p) setProfile(p)

      const { data: msgs } = await getMessages(matchId)
      if (msgs) setMessages(msgs as ChatMessage[])
      setLoading(false)
      scrollToBottom(false)

      markAsRead(matchId)

      const msgChannel = supabase.channel(`messages:${matchId}`)
      msgChannelRef.current = msgChannel
      msgChannel.on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}`,
      }, (payload: { new: Record<string, unknown> }) => {
        const m = payload.new as unknown as ChatMessage
        setMessages(prev => {
          if (prev.some(p => p.id === m.id)) return prev
          return [...prev, m]
        })
        scrollToBottom()
        if (m.sender_id !== uid) {
          markAsRead(matchId)
          clearTimeout(suggTimeoutRef.current)
          suggTimeoutRef.current = setTimeout(() => loadMessageSuggestions(), 3000)
        }
      })
      msgChannel.on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}`,
      }, (payload: { new: Record<string, unknown> }) => {
        const m = payload.new as unknown as ChatMessage
        setMessages(prev => prev.map(p => p.id === m.id ? m : p))
      })
      msgChannel.on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}`,
      }, (payload: { old: Record<string, unknown> }) => {
        setMessages(prev => prev.filter(p => p.id !== payload.old.id))
      })
      msgChannel.subscribe()

      const typingChannel = supabase.channel(`typing:match-${matchId}`)
      typingChannelRef.current = typingChannel
      typingChannel.on('broadcast', { event: 'typing' }, (payload: { payload?: { userId?: string } }) => {
        setIsTyping(payload.payload?.userId === oId)
        if (payload.payload?.userId === oId) {
          clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000)
        }
      })
      typingChannel.subscribe()

      const presenceChannel = supabase.channel(`presence:${oId}`, { config: { presence: { key: '' } } })
      presenceChannelRef.current = presenceChannel
      presenceChannel.on('presence', { event: 'sync' }, () => {
        setIsOnline(Object.keys(presenceChannel.presenceState()).length > 0)
      })
      presenceChannel.subscribe()
    })

    return () => {
      if (msgChannelRef.current) supabase.removeChannel(msgChannelRef.current)
      if (typingChannelRef.current) supabase.removeChannel(typingChannelRef.current)
      if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current)
    }
  }, [matchId, router, toast, scrollToBottom, loadMessageSuggestions])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    setReplyTo(null)
    setShowEmoji(false)
    setShowAi(false)
    setShowMsgSugg(false)
    const { error } = await sendMessage(matchId, text)
    if (error) toast("Erreur d'envoi", 'error')
    setSending(false)
    scrollToBottom()
  }, [input, sending, matchId, toast, scrollToBottom])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    if (e.target.value) setShowMsgSugg(false)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingPhoto(file)
    setShowConsent(true)
    if (fileRef.current) fileRef.current.value = ''
  }

  const confirmPhotoSend = async () => {
    if (!pendingPhoto) return
    setShowConsent(false)
    setShowSafety(true)
  }

  const proceedPhotoSend = async () => {
    if (!pendingPhoto) return
    setShowSafety(false)
    const { error } = await sendPhotoMessage(matchId, pendingPhoto)
    if (error) toast("Erreur d'envoi", 'error')
    else {
      logConsent(myId, 'share_photo', otherId, { content_type: 'photo' })
      scrollToBottom()
    }
    setPendingPhoto(null)
  }

  const cancelPhotoSend = () => {
    setShowConsent(false)
    setShowSafety(false)
    setPendingPhoto(null)
  }

  const handleVoiceToggle = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = e => chunksRef.current.push(e.data)
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const path = `chat_audio/${matchId}/${Date.now()}-${user.id}.webm`
        const { error: uploadErr } = await supabase.storage.from('chat_audio').upload(path, blob)
        if (uploadErr) { toast("Erreur d'envoi vocal", 'error'); return }
        const { data: { publicUrl } } = supabase.storage.from('chat_audio').getPublicUrl(path)
        await supabase.from('messages').insert({
          match_id: matchId, sender_id: user.id, audio_url: publicUrl,
        })
        scrollToBottom()
        stream.getTracks().forEach(t => t.stop())
      }
      recorder.start()
      setIsRecording(true)
      let dur = 0
      const interval = setInterval(() => { dur++; setRecordingDuration(dur) }, 1000)
      setTimeout(() => {
        if (recorder.state === 'recording') { recorder.stop(); clearInterval(interval); setRecordingDuration(0) }
      }, 30000)
      recorder.onstop = () => { clearInterval(interval); setRecordingDuration(0); setIsRecording(false) }
    } catch {
      toast('Microphone non accessible', 'error')
    }
  }

  const handleReply = (msg: ChatMessage) => {
    setReplyTo(msg)
    inputRef.current?.focus()
  }

  const handleEdit = async (msg: ChatMessage) => {
    const diff = Date.now() - new Date(msg.created_at).getTime()
    if (diff > 900000) { toast('Délai de modification expiré (15 min)', 'error'); return }
    const { error } = await supabase.from('messages').update({ text: msg.text, edited_at: new Date().toISOString() }).eq('id', msg.id)
    if (error) toast('Erreur de modification', 'error')
  }

  const handleDelete = async (msg: ChatMessage) => {
    const diff = Date.now() - new Date(msg.created_at).getTime()
    if (diff > 3600000) { toast('Délai de suppression expiré (60 min)', 'error'); return }
    const { error } = await supabase.from('messages').update({ deleted_for_all: true }).eq('id', msg.id)
    if (error) toast('Erreur de suppression', 'error')
  }

  const handleUnmatch = async () => {
    const { unmatchUser } = await import('@/lib/api')
    const { error } = await unmatchUser(matchId)
    if (error) { toast("Erreur lors de la suppression", 'error'); return }
    router.push('/matches')
  }

  const loadAiSuggestions = useCallback(async () => {
    if (!profile) return
    const result = await getAIIcebreaker(profile.id)
    if (result.suggestion) setAiSuggestions([result.suggestion])
    setShowAi(true)
  }, [profile])

  const loadDateIdeas = useCallback(async () => {
    if (!otherId || loadingDates) return
    setLoadingDates(true)
    try {
      const res = await fetch('/api/ai/date-suggestions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: otherId }),
      })
      const json = await res.json()
      if (json.suggestions) setDateSuggestions(json.suggestions)
    } catch {
      toast('Erreur de suggestion', 'error')
    } finally {
      setLoadingDates(false)
    }
  }, [otherId, loadingDates, toast])

  const sendDateSuggestion = async (s: DateSuggestion) => {
    const text = `💌 Idée de date : ${s.type}\n${s.description}\nBudget : ${s.budget} · ${s.distance}`
    setInput(text)
    setDateSuggestions([])
    inputRef.current?.focus()
  }

  const handleDuelChallenge = async () => {
    if (!otherId || !myId) return
    setMenuOpen(false)
    const { data: profiles } = await supabase
      .from('profiles').select('id').neq('id', myId).neq('id', otherId).limit(2)
    if (!profiles || profiles.length < 2) {
      toast('Pas assez de profils pour un duel', 'error')
      return
    }
    const { data: duel } = await createDuel(profiles[0].id, profiles[1].id)
    if (!duel) { toast('Erreur de création du duel', 'error'); return }
    const text = `⚔️ Duel lancé ! Qui est ton choix ? ${duel.id}`
    await supabase.from('messages').insert({
      match_id: matchId, sender_id: myId, text,
    })
    scrollToBottom()
    toast('Duel créé !', 'success')
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex-1 flex flex-col bg-transparent h-full">
      <h1 className="sr-only">Chat</h1>
      <header className="flex items-center gap-3 px-3 py-3 border-b border-theme/50 bg-theme/80 backdrop-blur-xl z-10">
        <button onClick={() => router.push('/matches')} aria-label="Retour" className="p-2 -ml-1 rounded-xl hover:bg-surface transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-hover ring-2 ring-theme">
              {profile?.photos?.[0] ? (
                <Image src={profile.photos[0]} alt={profile.name} width={40} height={40} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-secondary text-sm">?</div>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5"><OnlineStatus isOnline={isOnline} size="sm" /></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{profile?.name || 'Chat'}</h3>
              {profile?.age && <span className="text-xs text-secondary">{profile.age} ans</span>}
            </div>
            <OnlineBadge isOnline={isOnline} />
          </div>
        </div>

        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" className="p-2 rounded-xl hover:bg-surface transition-colors">
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 w-52 bg-surface rounded-xl border border-theme shadow-xl overflow-hidden py-1">
                <button onClick={() => { setMenuOpen(false); router.push(`/compatibility/${matchId}`) }}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-hover flex items-center gap-2.5">
                  <BarChart3 size={14} className="text-success" /> Compatibilité
                </button>
                <button onClick={() => { setMenuOpen(false); loadAiSuggestions() }}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-hover flex items-center gap-2.5">
                  <Sparkles size={14} className="text-warning" /> Suggestions IA
                </button>
                <button onClick={() => { setMenuOpen(false); loadDateIdeas() }}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-hover flex items-center gap-2.5">
                  <Heart size={14} className="text-primary" /> Idée de date
                </button>
                <button onClick={handleDuelChallenge}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-hover flex items-center gap-2.5">
                  <Swords size={14} className="text-secondary" /> Lancer un duel
                </button>
                <button onClick={() => { setMenuOpen(false); (async () => {
                  const { error } = await blockUser(otherId)
                  if (error) toast(error, 'error')
                  else { toast('Utilisateur bloqué', 'success'); logConsent(myId, 'user_blocked', otherId) }
                })().catch(logger.error) }}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-hover flex items-center gap-2.5 text-error">
                  <ShieldOff size={14} /> Bloquer
                </button>
                <button onClick={() => { setMenuOpen(false); handleUnmatch() }}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-hover flex items-center gap-2.5 text-error">
                  <UserMinus size={14} /> Ne plus match
                </button>
                <button onClick={() => { setMenuOpen(false); setShowReport(true) }}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-hover flex items-center gap-2.5">
                  <Flag size={14} className="text-secondary" /> Signaler
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <ReportSheet
        open={showReport}
        onClose={() => setShowReport(false)}
        onSubmit={async (reason, description) => {
          const { error } = await reportUser({
            reported_id: otherId,
            reason,
            description,
            match_id: matchId,
          })
          if (error) toast(error, 'error')
          else toast('Signalement envoyé', 'success')
        }}
        reportedName={profile?.name || 'cet utilisateur'}
      />

      <ConsentDialog
        open={showConsent}
        title="Partager une photo ?"
        description="Tu t'apprêtes à partager une photo avec ton match. Assure-toi d'être à l'aise avec ce partage."
        contentLabel="Une fois partagée, tu ne peux pas contrôler sa diffusion. Ne partage que ce avec quoi tu es à l'aise."
        onConfirm={confirmPhotoSend}
        onCancel={cancelPhotoSend}
        onRevoke={() => { logConsent(myId, 'consent_revoked'); toast('Consentement retiré', 'success'); cancelPhotoSend() }}
      />

      <SafetyReminder
        open={showSafety}
        type="photo"
        onDismiss={cancelPhotoSend}
        onProceed={proceedPhotoSend}
      />

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin">
        {messages.length === 0 && !isTyping ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 to-transparent mx-auto mb-4 flex items-center justify-center border border-primary/10">
              <Smile size={28} className="text-primary/40" />
            </div>
            <h3 className="font-semibold text-lg">C&apos;est le début de votre histoire</h3>
            <p className="text-secondary text-sm mt-1 max-w-xs">
              Envoyez un message à {profile?.name?.split(' ')[0] || 'votre match'} pour briser la glace.
            </p>
            {profile && aiSuggestions.length === 0 && (
              <button onClick={loadAiSuggestions}
                className="mt-4 px-4 py-2 rounded-full text-xs font-medium text-theme flex items-center gap-1.5 transition-all active:scale-95"
                style={{ background: 'var(--primary)' }}>
                <Sparkles size={14} /> Suggestion de message
              </button>
            )}
          </div>
        ) : (
          <>
            <DateSeparator messages={messages} />
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} isOwn={msg.sender_id === myId}
                onReply={handleReply} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </>
        )}

        {isTyping && profile && <TypingIndicator name={profile.name.split(' ')[0]} />}
        <div ref={messagesEndRef} />
      </div>

      <AnimatePresence>
        {showAi && aiSuggestions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="px-3 py-2 border-t border-theme/50 bg-theme/95">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-warning" />
              <span className="text-xs font-medium text-warning">Suggestions</span>
              <button onClick={() => setShowAi(false)} aria-label="Fermer" className="ml-auto p-1"><X size={14} className="text-muted" /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {aiSuggestions.map((s, i) => (
                <button key={i} onClick={() => { setInput(s); setShowAi(false); inputRef.current?.focus() }}
                  className="px-3 py-1.5 rounded-full text-xs bg-surface border border-theme text-secondary hover:border-primary/30 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dateSuggestions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="px-3 py-2 border-t border-theme/50 bg-theme/95">
            <div className="flex items-center gap-2 mb-2">
              <Heart size={14} className="text-primary" />
              <span className="text-xs font-medium text-primary">Idées de date</span>
              <button onClick={() => setDateSuggestions([])} aria-label="Fermer" className="ml-auto p-1"><X size={14} className="text-muted" /></button>
            </div>
            <div className="flex flex-col gap-2">
              {loadingDates ? (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                  Génération d&apos;idées...
                </div>
              ) : dateSuggestions.map((s, i) => (
                <button key={i} onClick={() => sendDateSuggestion(s)}
                  className="text-left px-3 py-2 rounded-xl bg-surface border border-theme hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-theme capitalize">{s.type}</span>
                    <span className="text-[10px] text-muted">{s.budget} · {s.distance}</span>
                  </div>
                  <p className="text-[11px] text-secondary">{s.description}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMsgSugg && msgSuggestions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className="px-3 py-2 border-t border-theme/50 bg-theme/95">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={12} className="text-warning" />
              <span className="text-[10px] font-medium text-warning/70 uppercase tracking-wider">Réponse suggérée</span>
              <button onClick={() => setShowMsgSugg(false)} aria-label="Fermer" className="ml-auto p-0.5"><X size={12} className="text-muted" /></button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {msgSuggestions.map((s, i) => (
                <button key={i} onClick={() => { setInput(s); setShowMsgSugg(false); inputRef.current?.focus() }}
                  className="px-2.5 py-1.5 rounded-lg text-xs bg-surface border border-theme text-secondary hover:border-primary/30 hover:text-theme transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {replyTo && (
        <div className="px-3 py-2 border-t border-theme/50 bg-theme/95 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-primary">En réponse</p>
            <p className="text-xs text-secondary truncate">{replyTo.text || '📎 Pièce jointe'}</p>
          </div>
          <button onClick={() => setReplyTo(null)} aria-label="Annuler la réponse" className="p-1"><X size={14} className="text-muted" /></button>
        </div>
      )}

      <div className="px-3 pb-3 pt-2 border-t border-theme/50 bg-theme/95">
        <div className="flex items-end gap-2">
          <button onClick={() => fileRef.current?.click()} aria-label="Joindre une photo" className="p-2.5 rounded-xl hover:bg-surface transition-colors shrink-0">
            <ImageIcon size={18} className="text-secondary" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />

          <button onClick={() => setShowEmoji(!showEmoji)} aria-label="Émojis" className="p-2.5 rounded-xl hover:bg-surface transition-colors shrink-0">
            <Smile size={18} className="text-secondary" />
          </button>

          <button onClick={loadMessageSuggestions} aria-label="Suggestions" className="p-2.5 rounded-xl hover:bg-surface transition-colors shrink-0">
            <Sparkles size={18} className="text-warning" />
          </button>

          <div className="flex-1 flex items-end gap-2 bg-surface rounded-2xl px-3 py-1 border border-theme focus-within:border-primary/30 transition-colors">
            <input
              ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
              placeholder="Écrivez un message..."
              className="flex-1 bg-transparent text-sm py-2 outline-none text-theme placeholder:text-muted min-w-0"
              maxLength={5000}
            />
            {input.trim() ? (
              <button onClick={handleSend} disabled={sending} aria-label="Envoyer"
                className="p-2 shrink-0 text-theme disabled:opacity-30 transition-all active:scale-90"
                style={{ color: 'var(--primary)' }}>
                <Send size={18} />
              </button>
            ) : (
              <button onClick={handleVoiceToggle} aria-label={isRecording ? "Arrêter" : "Message vocal"}
                className="p-2 shrink-0 transition-all active:scale-90"
                style={{ color: isRecording ? 'var(--error)' : 'var(--textSecondary)' }}>
                {isRecording ? <Square size={18} /> : <Mic size={18} />}
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isRecording && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 mt-2 px-1">
              <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-error" />
              <span className="text-xs text-secondary">Enregistrement... {recordingDuration}s</span>
              <span className="text-[10px] text-muted">(max 30s)</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showEmoji && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="mt-2 p-2 bg-surface rounded-xl border border-theme">
              <div className="flex flex-wrap gap-1">
                {EMOJI_LIST.map(e => (
                  <button key={e} onClick={() => { setInput(prev => prev + e); inputRef.current?.focus() }}
                    className="w-9 h-9 flex items-center justify-center text-lg hover:bg-hover rounded-lg transition-colors">
                    {e}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

const DateSeparator = React.memo(function DateSeparator({ messages }: { messages: ChatMessage[] }) {
  const seen = new Set<string>()
  const separators: { date: string; label: string }[] = []
  for (const msg of messages) {
    const d = new Date(msg.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    if (!seen.has(d)) {
      seen.add(d)
      separators.push({ date: d, label: d })
    }
  }
  return (
    <>
      {separators.map(s => (
        <div key={s.date} className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-theme" />
          <span className="text-[10px] text-muted font-medium">{s.label}</span>
          <div className="flex-1 h-px bg-theme" />
        </div>
      ))}
    </>
  )
})


