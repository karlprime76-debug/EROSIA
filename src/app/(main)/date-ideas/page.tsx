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

  useEffect(() => {
    getDateIdeas(category || undefined).then(({ data }) => {
      if (data) setIdeas(data as DateIdea[])
    }).catch(() => {})
    getMyDateIdeas().then(({ data }) => {
      if (data) setMyIdeaIds(new Set((data as MyDateIdea[]).map(m => m.idea_id)))
    }).catch(() => {})
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
        <button onClick={() => router.back()} aria-label="Retour" className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Idées de date</h2>
      </header>
      <div className="px-4 pb-2 overflow-x-auto">
        <div className="flex gap-2">
          <button onClick={() => setCategory('')}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${!category ? 'bg-[#D92D4A] text-white' : 'bg-[#1C1C1E] text-[#9E9488] border border-[#2A2826]'}`}>
            Toutes
          </button>
          {categories.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${category === c ? 'bg-[#D92D4A] text-white' : 'bg-[#1C1C1E] text-[#9E9488] border border-[#2A2826]'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 px-4 pb-8 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          {ideas.map(idea => (
            <button key={idea.id} onClick={() => toggle(idea.id)}
              className={`bg-[#1C1C1E] rounded-xl border p-4 text-left transition ${myIdeaIds.has(idea.id) ? 'border-[#D92D4A]' : 'border-[#2A2826]'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{idea.emoji || '💝'}</span>
                <Heart size={14} className={myIdeaIds.has(idea.id) ? 'text-[#D92D4A] fill-[#D92D4A]' : 'text-[#6B6258]'} />
              </div>
              <p className="text-xs font-medium">{idea.idea}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
