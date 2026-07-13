'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { X, Trash2, MessageCircle, Archive, Loader2 } from 'lucide-react'
import type { StoryGroup, Story } from '@/lib/stories/types'
import { FocusTrap } from '@/components/FocusTrap'
import { logger } from '@/lib/logger'

const REACTION_EMOJIS = ['❤️', '😂', '😮', '🔥', '😢', '👍']

interface StoryReaderProps {
  groups: StoryGroup[]
  initialGroupIndex?: number
  onClose: () => void
  onDelete?: (storyId: string) => void
}

function StoryViewer({
  story,
  stories,
  storyIdx,
  isActive,
  onProgressEnd,
  onReact,
  onDelete,
  onArchive,
  onReply,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  myReaction,
}: {
  story: Story
  stories: Story[]
  storyIdx: number
  isActive: boolean
  onProgressEnd: () => void
  onReact: (emoji: string) => void
  onDelete?: (id: string) => void
  onArchive?: (id: string) => void
  onReply?: (id: string) => void
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
  myReaction: string | null
}) {
  const [progress, setProgress] = useState(0)
  const [showReactions, setShowReactions] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef(0)
  const animRef = useRef<number>(0)
  const startTime = useRef<number>(0)

  useEffect(() => {
    if (!isActive) {
      cancelAnimationFrame(animRef.current)
      return
    }
    setProgress(0)
    setLoaded(false)

    const duration = story.type === 'video' ? 15000 : 5000
    startTime.current = Date.now()
    progressRef.current = 0

    const video = videoRef.current
    if (story.type === 'video' && video) {
      video.currentTime = 0
      video.play().catch(() => {})
      const onTime = () => {
        if (!video) return
        const pct = (video.currentTime / (video.duration || 15)) * 100
        setProgress(Math.min(pct, 100))
        if (pct >= 100) onProgressEnd()
      }
      video.addEventListener('timeupdate', onTime)
      return () => {
        video?.removeEventListener('timeupdate', onTime)
        video?.pause()
      }
    }

    const animate = () => {
      const elapsed = Date.now() - startTime.current
      const pct = Math.min((elapsed / duration) * 100, 100)
      setProgress(pct)
      if (pct >= 100) { onProgressEnd(); return }
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [story.id, story.type, isActive, onProgressEnd])

  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    if (x < rect.width * 0.3 && hasPrev) onPrev()
    else if (x > rect.width * 0.7 && hasNext) onNext()
    else setShowReactions(!showReactions)
  }

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-2 pt-2">
        {stories.map((s, i) => (
          <div key={s.id} className="flex-1 h-0.5 bg-[var(--borderMedium)]/30 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${i < storyIdx ? 100 : i === storyIdx ? progress : 0}%`,
                background: i < storyIdx ? 'var(--border)' : 'var(--primary)',
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex-1 relative cursor-pointer" onClick={handleTap} role="presentation">
        {story.type === 'video' ? (
          <video
            ref={videoRef}
            src={story.media_url}
            className="w-full h-full object-contain bg-[var(--bg)]"
            playsInline
            muted
            onCanPlay={() => setLoaded(true)}
          />
        ) : (
          <Image
            src={story.media_url}
            alt={story.caption || 'Story'}
            fill
            className={`object-contain bg-[var(--bg)] transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
            unoptimized
            onLoad={() => setLoaded(true)}
          />
        )}

        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--bg)]/40 to-transparent pointer-events-none" />
      </div>

      {myReaction && (
        <div className="absolute bottom-20 right-4 text-3xl z-20 animate-bounce">
          {myReaction}
        </div>
      )}

      {showReactions && (
        <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[var(--bg)]/90 to-transparent pt-16 pb-6 px-4">
          <div className="flex items-center justify-center gap-3">
            {REACTION_EMOJIS.map(emoji => (
              <button
                key={emoji} type="button"
                onClick={() => { onReact(emoji); setShowReactions(false) }}
                aria-label={emoji}
                className={`text-2xl transition-all active:scale-150 hover:scale-125 ${myReaction === emoji ? 'scale-125' : 'opacity-70 hover:opacity-100'}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
        {onReply && (
          <button type="button" onClick={() => { if (!actionLoading) { setActionLoading('reply'); onReply(story.id) } }}
            aria-label="Répondre en privé" disabled={!!actionLoading}
            className="w-8 h-8 rounded-full bg-[var(--card)]/40 flex items-center justify-center hover:bg-[var(--cardHover)]/60 transition disabled:opacity-40">
            {actionLoading === 'reply' ? <Loader2 size={12} className="animate-spin" /> : <MessageCircle size={14} />}
          </button>
        )}
        {onArchive && (
          <button type="button" onClick={() => { (async () => {
            if (actionLoading) return
            setActionLoading('archive')
            await onArchive(story.id)
            setActionLoading(null)
          })() }}
            aria-label="Archiver" disabled={!!actionLoading}
            className="w-8 h-8 rounded-full bg-[var(--card)]/40 flex items-center justify-center hover:bg-[var(--cardHover)]/60 transition disabled:opacity-40">
            {actionLoading === 'archive' ? <Loader2 size={12} className="animate-spin" /> : <Archive size={14} />}
          </button>
        )}
        {onDelete && (
          <button type="button" onClick={() => { (async () => {
            if (actionLoading) return
            setActionLoading('delete')
            onDelete(story.id)
            setActionLoading(null)
          })() }}
            aria-label="Supprimer" disabled={!!actionLoading}
            className="w-8 h-8 rounded-full bg-[var(--card)]/40 flex items-center justify-center hover:bg-[var(--cardHover)]/60 transition disabled:opacity-40">
            {actionLoading === 'delete' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        )}
      </div>
    </div>
  )
}

export function StoryReader({ groups, initialGroupIndex = 0, onClose, onDelete }: StoryReaderProps) {
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex)
  const [storyIdx, setStoryIdx] = useState(0)
  const [myReactions, setMyReactions] = useState<Record<string, string>>({})

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => { setStoryIdx(0) }, [groupIdx])

  const currentGroup = groups[groupIdx]
  const currentStory = currentGroup?.stories?.[storyIdx]

  const recordView = useCallback(async (storyId: string) => {
    try { await fetch(`/api/stories/${storyId}/view`, { method: 'POST' }) }
    catch (e) { logger.warn('Failed to record story view', { storyId, error: String(e) }) }
  }, [])

  useEffect(() => {
    if (currentStory?.id) recordView(currentStory.id)
  }, [currentStory?.id, recordView])

  const next = useCallback(() => {
    if (!currentGroup) return
    if (storyIdx < currentGroup.stories.length - 1) { setStoryIdx(i => i + 1) }
    else if (groupIdx < groups.length - 1) { setGroupIdx(i => i + 1) }
    else onClose()
  }, [storyIdx, currentGroup, groupIdx, groups.length, onClose])

  const prev = useCallback(() => {
    if (storyIdx > 0) { setStoryIdx(i => i - 1) }
    else if (groupIdx > 0) { setGroupIdx(i => i - 1) }
  }, [storyIdx, groupIdx])

  const handleReact = async (emoji: string) => {
    if (!currentStory) return
    try {
      const res = await fetch(`/api/stories/${currentStory.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      })
      if (res.ok) {
        setMyReactions(r => ({ ...r, [currentStory.id]: myReactions[currentStory.id] === emoji ? '' : emoji }))
      }
    } catch { logger.warn('React failed') }
  }

  const handleDelete = async (storyId: string) => {
    onDelete?.(storyId)
    next()
  }

  const handleArchive = async (storyId: string) => {
    try {
      await fetch(`/api/stories/${storyId}/archive`, { method: 'POST' })
      onDelete?.(storyId)
      next()
    } catch { logger.warn('Archive failed') }
  }

  const handleReply = useCallback((_storyId: string) => {
    onClose()
    if (currentGroup) {
      window.location.href = `/chat?userId=${currentGroup.userId}`
    }
  }, [onClose, currentGroup])

  if (!currentGroup || !currentStory) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--bg)] flex items-center justify-center">
        <p className="text-[var(--textSecondary)]">Story introuvable</p>
      </div>
    )
  }

  const hasPrev = storyIdx > 0 || groupIdx > 0
  const hasNext = storyIdx < (currentGroup.stories.length - 1) || groupIdx < groups.length - 1

  return (
    <FocusTrap><div className="fixed inset-0 z-50 bg-[var(--bg)] flex flex-col">
      <div className="relative flex-1">
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-3 pt-3 pb-2 bg-gradient-to-b from-[var(--bg)]/50 to-transparent">
          <div className="flex items-center gap-2 flex-1">
            {currentGroup.photo && (
              <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-[var(--border)]">
                <Image src={currentGroup.photo} alt={currentGroup.name} width={32} height={32} className="object-cover w-full h-full" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-[var(--textPrimary)]">{currentGroup.name}</p>
              <p className="text-[10px] text-[var(--textSecondary)]">
                {new Date(currentStory.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[var(--textMuted)]">
              {storyIdx + 1}/{currentGroup.stories.length}
            </span>
            <button type="button" onClick={onClose} aria-label="Fermer"
              className="w-8 h-8 rounded-full bg-[var(--surfaceElevated)] flex items-center justify-center hover:bg-[var(--cardHover)] transition">
              <X size={16} />
            </button>
          </div>
        </div>

        <StoryViewer
          story={currentStory}
          stories={currentGroup.stories}
          storyIdx={storyIdx}
          isActive
          onProgressEnd={next}
          onReact={handleReact}
          onDelete={handleDelete}
          onArchive={handleArchive}
          onReply={handleReply}
          onPrev={prev}
          onNext={next}
          hasPrev={hasPrev}
          hasNext={hasNext}
          myReaction={myReactions[currentStory.id] ?? null}
        />
      </div>
    </div></FocusTrap>
  )
}
