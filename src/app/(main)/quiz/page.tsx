'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Heart } from 'lucide-react'
import { getQuizQuestions, saveQuizAnswers, getQuizAnswers } from '@/lib/api'

interface QuizQuestion {
  id: string
  question: string
  options: Array<{ text: string; trait: string }>
  category: string | null
}

export default function QuizPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [current, setCurrent] = useState(0)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    getQuizQuestions().then(({ data }) => {
      if (data) setQuestions(data)
    })
    getQuizAnswers().then(({ data }) => {
      if (data?.length) {
        const m: Record<string, number> = {}
        data.forEach((a: { question_id: string; answer_index: number }) => { m[a.question_id] = a.answer_index })
        setAnswers(m)
      }
    })
  }, [])

  const handleAnswer = (index: number) => {
    const q = questions[current]
    setAnswers(prev => ({ ...prev, [q.id]: index }))
    if (current < questions.length - 1) {
      setCurrent(current + 1)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const entries = Object.entries(answers).map(([questionId, answerIndex]) => ({ questionId, answerIndex }))
    await saveQuizAnswers(entries)
    setDone(true)
    setSaving(false)
  }

  if (questions.length === 0) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#D92D4A', borderTopColor: 'transparent' }} />
    </div>
  )

  if (done) return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
      <Heart size={48} className="text-[#D92D4A] mb-4" fill="#D92D4A" />
      <h2 className="text-2xl font-bold mb-2">Quiz terminé !</h2>
      <p className="text-[#9E9488] mb-6">Tes réponses nous aident à trouver des personnes compatibles.</p>
      <button onClick={() => router.push('/discover')}
        className="px-8 py-3 rounded-full font-semibold text-white" style={{ background: '#D92D4A' }}>
        Découvrir des profils
      </button>
    </div>
  )

  const q = questions[current]
  const progress = ((current + 1) / questions.length) * 100

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button onClick={() => router.back()} className="p-1"><ArrowLeft size={22} /></button>
        <div className="flex-1">
          <h2 className="text-lg font-bold">Quiz de compatibilité</h2>
          <p className="text-xs text-[#9E9488]">Question {current + 1}/{questions.length}</p>
        </div>
      </header>

      <div className="px-5 mb-4">
        <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: '#D92D4A' }} />
        </div>
      </div>

      <div className="flex-1 px-5">
        {q.category && (
          <p className="text-xs font-semibold text-[#D92D4A] uppercase tracking-wider mb-2">{q.category}</p>
        )}
        <h3 className="text-xl font-bold mb-6">{q.question}</h3>
        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => handleAnswer(i)}
              className={`w-full text-left px-5 py-4 rounded-xl border transition ${
                answers[q.id] === i
                  ? 'border-[#D92D4A] bg-[#D92D4A]/10 text-white'
                  : 'border-[#2A2826] bg-[#1C1C1E] text-[#9E9488]'
              }`}>
              {opt.text}
            </button>
          ))}
        </div>
      </div>

      {current === questions.length - 1 && (
        <div className="px-5 pb-8">
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3.5 rounded-full font-semibold text-white disabled:opacity-50"
            style={{ background: '#D92D4A' }}>
            {saving ? 'Enregistrement...' : 'Voir mes résultats'}
          </button>
        </div>
      )}
    </div>
  )
}
