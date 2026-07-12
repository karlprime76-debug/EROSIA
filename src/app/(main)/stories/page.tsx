'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Plus, Trash2, Eye, Heart, Loader } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { checkPremium } from '@/lib/api'
import { getActiveStories, deleteStory, uploadStory, getStoryViews, getStoryReactions } from '@/lib/stories'
import { useToast } from '@/components/Toast'
import dynamic from 'next/dynamic'
const StoryReader = dynamic(() => import('@/components/StoryReader').then(m => ({ default: m.StoryReader })), { ssr: false })
const StoryCreator = dynamic(() => import('@/components/StoryCreator').then(m => ({ default: m.StoryCreator })), { ssr: false })
import type { StoryGroup, StoryView, StoryPrivacy } from '@/lib/stories/types'

export default function StoriesPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<StoryGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [readerOpen, setReaderOpen] = useState(false)
  const [readerIndex, setReaderIndex] = useState(0)
  const [expandedViews, setExpandedViews] = useState<string | null>(null)
  const [viewsData, setViewsData] = useState<Record<string, StoryView[]>>({})
  const [reactionsData, setReactionsData] = useState<Record<string, number>>({})
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const { toast } = useToast()

  const load = useCallback(async (pageNum: number, append = false) => {
    const { data, error } = await getActiveStories(pageNum)
    if (error) { toast(error, 'error'); return }
    if (data.length === 0 && pageNum > 1) { setHasMore(false); return }
    setGroups(prev => append ? [...prev, ...data] : data)
  }, [toast])

  useEffect(() => {
    let cancelled = false
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (!cancelled) setLoading(false); return }
      await load(1)
      if (!cancelled) {
        setLoading(false)
        checkPremium().then(setIsPremium).catch(() => {})
      }
    }
    initialize()
    return () => { cancelled = true }
  }, [load])

  const handleScroll = useCallback(async (e: React.UIEvent<HTMLDivElement>) => {
    if (isLoadingMore || !hasMore) return
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 400) {
      setIsLoadingMore(true)
      const nextPage = page + 1
      await load(nextPage, true)
      setPage(nextPage)
      setIsLoadingMore(false)
    }
  }, [hasMore, page, load, isLoadingMore])

  const handleUpload = async (file: File, privacy: StoryPrivacy) => {
    try {
      const result = await uploadStory(file, privacy)
      if (result.error) { toast(result.error, 'error'); return }
      toast('Story publiée ✓', 'success')
      setGroups([]); setPage(1); setHasMore(true)
      await load(1)
    } catch { toast('Erreur lors de la publication', 'error') }
  }

  const handleDelete = async (storyId: string) => {
    try {
      const { error } = await deleteStory(storyId)
      if (error) { toast(error, 'error'); return }
      setGroups(prev => prev.map(g => ({
        ...g,
        stories: g.stories.filter(s => s.id !== storyId),
      })).filter(g => g.stories.length > 0))
    } catch { toast('Erreur lors de la suppression', 'error') }
  }

  const openReader = (index: number) => {
    setReaderIndex(index)
    setReaderOpen(true)
  }

  const toggleViews = async (storyId: string) => {
    if (expandedViews === storyId) { setExpandedViews(null); return }
    setExpandedViews(storyId)
    try {
      if (!viewsData[storyId]) {
        const { data } = await getStoryViews(storyId)
        if (data) setViewsData(v => ({ ...v, [storyId]: data }))
      }
      if (!reactionsData[storyId]) {
        const { data } = await getStoryReactions(storyId)
        if (data) setReactionsData(r => ({ ...r, [storyId]: data.length }))
      }
    } catch { toast('Erreur', 'error') }
  }

  if (loading) return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-2.5 rounded-xl"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Stories</h2>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
      </div>
    </div>
  )

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <h1 className="sr-only">Stories</h1>
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-2.5 rounded-xl"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold flex-1">Stories</h2>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Ajouter une story"
          className="w-9 h-9 rounded-full bg-[var(--primary)] flex items-center justify-center active:scale-90"
        >
          <Plus size={18} className="text-[var(--textOnPrimary)]" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/mp4,video/quicktime"
          capture="environment"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            await handleUpload(file, 'public')
            e.target.value = ''
          }}
          className="hidden"
        />
      </header>

      <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
        <StoryCreator
          onUpload={handleUpload}
          premiumRequired={!isPremium}
        />
        {groups.slice(0, 8).map((g, i) => (
          <button
            key={g.userId}
            type="button"
            onClick={() => openReader(i)}
            className="flex flex-col items-center gap-1 shrink-0"
            style={{ width: 80 }}
          >
            <div
              className={`w-16 h-16 rounded-full p-0.5 ${
                g.allViewed
                  ? 'border-2 border-[var(--border)]'
                  : 'bg-gradient-to-br from-[var(--primary)] to-[var(--accentOrange)] shadow-glow'
              }`}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-[var(--card)] border-2 border-[var(--bg)]">
                {g.photo ? (
                  <Image src={g.photo} alt={g.name} width={64} height={64} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--textSecondary)] font-bold">{g.name.charAt(0)}</div>
                )}
              </div>
            </div>
            <span className="text-[10px] text-[var(--textSecondary)] truncate max-w-[72px] text-center">{g.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 pb-8 overflow-y-auto" onScroll={handleScroll}>
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-up">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 to-transparent mx-auto mb-5 flex items-center justify-center border border-[var(--primary)]/10">
              <span className="text-3xl opacity-40">📸</span>
            </div>
            <p className="text-lg font-semibold">Aucune story</p>
            <p className="text-[var(--textSecondary)] text-sm mt-1 max-w-xs leading-relaxed">Les stories apparaîtront ici pendant 24h.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.filter(g => g.userId !== groups[0]?.userId).map(group => (
              <div key={group.userId}>
                <div className="flex items-center gap-2 mb-3">
                  <button type="button" onClick={() => openReader(groups.indexOf(group))} className="flex items-center gap-2 flex-1">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--card)] ring-1 ring-[var(--border)]">
                      {group.photo && <Image src={group.photo} alt={group.name} width={32} height={32} className="object-cover w-full h-full" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{group.name}</p>
                      <p className="text-[10px] text-[var(--textSecondary)]">
                        {group.stories.length} story{group.stories.length > 1 ? 'ies' : 'y'}
                      </p>
                    </div>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {group.stories.map(story => (
                    <div key={story.id} className="relative aspect-[9/16] rounded-xl overflow-hidden bg-[var(--card)] group">
                      <button type="button" onClick={() => openReader(groups.indexOf(group))} className="w-full h-full">
                        {story.type === 'video' ? (
                          <video src={story.media_url} className="w-full h-full object-cover" muted playsInline />
                        ) : (
                          <Image src={story.media_url} alt="Contenu de la story" width={200} height={355} className="w-full h-full object-cover" />
                        )}
                      </button>
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)]/50 to-transparent pointer-events-none" />
                      <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between px-1">
                        <button
                          type="button"
                          onClick={() => toggleViews(story.id)}
                          aria-label="Voir les vues"
                          className="text-[10px] text-[var(--textPrimary)]/70 flex items-center gap-1 bg-[var(--card)]/40 px-1.5 py-0.5 rounded-full"
                        >
                          <Eye size={10} /> {viewsData[story.id]?.length ?? story.view_count ?? 0}
                        </button>
                        <span className="text-[10px] text-[var(--textPrimary)]/70 flex items-center gap-1 bg-[var(--card)]/40 px-1.5 py-0.5 rounded-full">
                          <Heart size={10} /> {reactionsData[story.id] ?? story.reaction_count ?? 0}
                        </span>
                      </div>
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={() => handleDelete(story.id)}
                          aria-label="Supprimer la story"
                          className="w-6 h-6 rounded-full bg-[var(--card)]/50 flex items-center justify-center hover:bg-[var(--cardHover)]/70"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {expandedViews && (
                  <div className="mt-1 bg-[var(--card)] rounded-xl p-3 max-h-40 overflow-y-auto">
                    <p className="text-[10px] text-[var(--textSecondary)] font-medium mb-2 uppercase tracking-wider">Vues</p>
                    {(viewsData[expandedViews] ?? []).length === 0 ? (
                      <p className="text-xs text-[var(--textSecondary)]">Aucune vue</p>
                    ) : (
                      <div className="space-y-1.5">
                        {(viewsData[expandedViews] ?? []).map(v => (
                          <div key={v.id} className="flex items-center gap-2">
                            {v.profile?.photos?.[0] && (
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-[var(--surfaceElevated)]">
                                <Image src={v.profile.photos[0]} alt={v.profile.name ?? 'Photo de profil'} width={20} height={20} className="object-cover" />
                              </div>
                            )}
                            <p className="text-xs">{v.profile?.name ?? 'Inconnu'}</p>
                            <p className="text-[10px] text-[var(--textSecondary)] ml-auto">
                              {new Date(v.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <Loader size={16} className="animate-spin text-[var(--textSecondary)]" />
              </div>
            )}
          </div>
        )}
      </div>

      {readerOpen && groups.length > 0 && (
        <StoryReader
          groups={groups}
          initialGroupIndex={readerIndex}
          onClose={() => setReaderOpen(false)}
          onDelete={(storyId) => { handleDelete(storyId) }}
        />
      )}
    </div>
  )
}
