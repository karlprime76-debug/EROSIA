'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ArrowLeft, Lightbulb, AlertTriangle, Info, CheckCircle, RefreshCw, Brain } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { CoachResult, Suggestion } from '@/lib/coach'

const severityIcon = {
  tip: Lightbulb,
  warning: AlertTriangle,
  info: Info,
}

const severityColor = {
  tip: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  info: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
}

export default function CoachPage() {
  const router = useRouter()
  const [result, setResult] = useState<CoachResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const analyzeRef = useRef(false)
  const analyze = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Non connecté'); setLoading(false); return }
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: user.id }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erreur'); setLoading(false); return }
      setResult(json)
    } catch {
      setError('Erreur réseau')
    }
    setLoading(false)
  }, [])

  useEffect(() => { if (!analyzeRef.current) { analyzeRef.current = true; analyze() } }, [analyze])

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2.5 rounded-xl hover:bg-primary/5 transition-colors" aria-label="Retour">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Coach IA
          </h1>
        </div>

        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-primary/5 animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
            <button onClick={analyze} className="block mt-2 text-primary hover:underline">Réessayer</button>
          </div>
        )}

        {result && (
          <>
            <div className="p-6 rounded-2xl glass space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Score du profil</p>
                  <p className="text-4xl font-bold">{result.score}/100</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
              </div>
              <p className="text-sm">{result.summary}</p>
            </div>

            {result.strengths.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-semibold flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Points forts</h2>
                <div className="flex flex-wrap gap-2">
                  {result.strengths.map((s, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {result.suggestions.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-400" /> Suggestions</h2>
                {result.suggestions.map((s: Suggestion, i: number) => {
                  const Icon = severityIcon[s.severity]
                  return (
                    <div key={i} className={`p-4 rounded-xl border ${severityColor[s.severity]}`}>
                      <div className="flex items-start gap-3">
                        <Icon className="w-5 h-5 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{s.title}</p>
                          <p className="text-xs mt-1 opacity-80">{s.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <button
              onClick={analyze}
              className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm hover:bg-primary/20 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Re-analyser
            </button>
          </>
        )}
      </div>
    </div>
  )
}
