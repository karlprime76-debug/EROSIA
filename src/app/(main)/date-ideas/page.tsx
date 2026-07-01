'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Heart } from 'lucide-react'
import { getDateIdeas, getMyDateIdeas, saveDateIdea, removeDateIdea } from '@/lib/api'

interface DateIdea {
  id: string
  idea: string
  emoji?: string
  category?: string
}

interface MyDateIdea {
  idea_id: string
}

export default function DateIdeasPage() {
  const router = useRouter()
  const [ideas, setIdeas] = useState<DateIdea[]>([])
  const [myIdeaIds, setMyIdeaIds] = useState<Set<string>>(new Set())
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getDateIdeas(category || undefined),
      getMyDateIdeas(),
    ]).then(([ideasData, myData]) => {
      if (ideasData.data) setIdeas(ideasData.data as DateIdea[])
      if (myData.data) setMyIdeaIds(new Set((myData.data as MyDateIdea[]).map(m => m.idea_id)))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [category])

  const toggle = async (ideaId: string) => {
    if (myIdeaIds.has(ideaId)) {
      await removeDateIdea(ideaId)
      setMyIdeaIds(prev => { const n = new Set(prev); n.delete(ideaId); return n })
    } else {
      await saveDateIdea(ideaId)
      setMyIdeaIds(prev => new Set(prev).add(ideaId))
    }
  }

  const categories = [...new Set(ideas.map(i => i.category).filter((c): c is string => !!c))]

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Idées de date</h2>
      </header>
      <div className="px-4 pb-2 overflow-x-auto">
        <div className="flex gap-2">
          <button type="button" onClick={() => setCategory('')}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${!category ? 'bg-primary text-on-primary' : 'bg-surface-elevated text-secondary border border-theme'}`}>
            Toutes
          </button>
          {categories.map(c => (
            <button type="button" key={c} onClick={() => setCategory(c)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${category === c ? 'bg-primary text-on-primary' : 'bg-surface-elevated text-secondary border border-theme'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 px-4 pb-8 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">          <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} /></div>
        ) : ideas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent mx-auto mb-4 flex items-center justify-center border border-primary/10">
              <span className="text-2xl opacity-40">💝</span>
            </div>
            <p className="text-sm text-secondary">Aucune idée de date dans cette catégorie.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {ideas.map(idea => (
              <button type="button" key={idea.id} onClick={() => toggle(idea.id)}
                className={`bg-surface-elevated rounded-xl border p-4 text-left transition ${myIdeaIds.has(idea.id) ? 'border-primary' : 'border-theme'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{idea.emoji || '💝'}</span>
                  <Heart size={14} className={myIdeaIds.has(idea.id) ? 'text-primary fill-primary' : 'text-secondary'} />
                </div>
                <p className="text-xs font-medium">{idea.idea}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
