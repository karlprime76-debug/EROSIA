'use client'

import { useState, useCallback } from 'react'
import { Sparkles, Lightbulb, AlertTriangle, Info, Loader, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import type { CoachResult, Suggestion } from '@/lib/coach'

interface CoachPanelProps {
  profileId: string
}

const SEVERITY_CONFIG = {
  warning: { icon: AlertTriangle, color: 'var(--warningVibrant)', bg: 'var(--warningBg)', label: 'Important' },
  info: { icon: Info, color: 'var(--info)', bg: 'var(--infoBg)', label: 'Info' },
  tip: { icon: Lightbulb, color: 'var(--primary)', bg: 'var(--primaryGlow)', label: 'Conseil' },
}

function SuggestionCard({ s }: { s: Suggestion }) {
  const cfg = SEVERITY_CONFIG[s.severity]
  const Icon = cfg.icon

  return (
    <div
      className="rounded-xl p-3 border"
      style={{ background: cfg.bg, borderColor: 'var(--borderLight)' }}
    >
      <div className="flex items-start gap-2.5">
        <Icon size={14} style={{ color: cfg.color }} className="shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</p>
            <span className="text-[9px] uppercase tracking-wider text-[var(--textMuted)] font-medium">{s.type}</span>
          </div>
          <p className="text-sm font-medium mt-0.5">{s.title}</p>
          <p className="text-[11px] text-[var(--textSecondary)] mt-1 leading-relaxed">{s.description}</p>
        </div>
      </div>
    </div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 80 ? 'var(--successVibrant)' : score >= 60 ? 'var(--warningVibrant)' : score >= 40 ? 'var(--accentOrange)' : 'var(--errorVibrant)'

  return (
    <div className="flex flex-col items-center">
      <svg width={72} height={72} className="-rotate-90">
        <circle cx={36} cy={36} r={r} fill="none" stroke="var(--border)" strokeWidth={5} />
        <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={5} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="text-xl font-bold -mt-[44px]" style={{ color }}>{score}</span>
      <span className="text-[9px] text-[var(--textSecondary)] uppercase tracking-wider mt-1">Score</span>
    </div>
  )
}

export function CoachPanel({ profileId }: CoachPanelProps) {
  const [result, setResult] = useState<CoachResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const fetchAnalysis = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      })
      if (!res.ok) {
        setError('Erreur analyse profil')
        return
      }
      const data = await res.json()
      setResult(data)
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }, [profileId])

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => { setExpanded(true); if (!result) fetchAnalysis() }}
        className="w-full flex items-center justify-between bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 hover:border-[var(--primary)]/30 transition"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accentOrange)] flex items-center justify-center">
            <Sparkles size={14} className="text-[var(--textOnPrimary)]" />
          </div>
          <span className="text-sm font-semibold">Coach IA</span>
        </div>
        <ChevronDown size={16} className="text-[var(--textSecondary)]" />
      </button>
    )
  }

  return (
    <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accentOrange)] flex items-center justify-center">
            <Sparkles size={14} className="text-[var(--textOnPrimary)]" />
          </div>
          <span className="text-sm font-semibold">Coach IA</span>
        </div>
        <div className="flex items-center gap-1.5">
          {result && (
            <button type="button" onClick={fetchAnalysis} disabled={loading} className="p-1.5 text-[var(--textSecondary)] hover:text-[var(--textPrimary)] transition">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
          <button type="button" onClick={() => setExpanded(false)} className="p-1.5 text-[var(--textSecondary)] hover:text-[var(--textPrimary)] transition">
            <ChevronUp size={16} />
          </button>
        </div>
      </div>

      {loading && !result && (
        <div className="flex items-center justify-center py-6">
          <Loader size={18} className="animate-spin text-[var(--primary)]" />
        </div>
      )}

      {error && (
        <div className="text-xs text-[var(--errorVibrant)] bg-[var(--errorBg)] rounded-lg p-3">{error}</div>
      )}

      {result && (
        <>
          <div className="flex items-center gap-4 py-1">
            <ScoreRing score={result.score} />
            <div className="flex-1">
              <p className="text-xs text-[var(--textSecondary)] leading-relaxed">{result.summary}</p>
              {result.strengths.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {result.strengths.map(s => (
                    <span key={s} className="text-[9px] font-medium text-[var(--successVibrant)] bg-[var(--successBg)] px-2 py-0.5 rounded-full">
                      ✓ {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {result.suggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-[var(--textSecondary)] uppercase tracking-wider">
                {result.suggestions.length} suggestion{result.suggestions.length > 1 ? 's' : ''}
              </p>
              {result.suggestions.map((s, i) => (
                <SuggestionCard key={i} s={s} />
              ))}
            </div>
          )}

          {result.suggestions.length === 0 && (
            <div className="text-center py-4">
              <p className="text-xs text-[var(--successVibrant)] font-medium">Aucune suggestion — ton profil est au top !</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
