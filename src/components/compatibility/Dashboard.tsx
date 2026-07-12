'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react'
import { ScoreGauge } from './ScoreGauge'
import { CriteriaCard } from './CriteriaCard'
import { getCompatibilityReport } from '@/lib/api'
import type { CompatibilityReport } from '@/lib/engine/compat-center/types'

export function CompatibilityDashboard({ matchId, onBack }: { matchId: string; onBack: () => void }) {
  const [report, setReport] = useState<CompatibilityReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getCompatibilityReport(matchId).then(({ data, error: err }) => {
      if (cancelled) return
      if (err) { setError(err); setLoading(false); return }
      setReport(data as CompatibilityReport)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [matchId])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--primary)' }} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Analyse de compatibilité...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 rounded-lg text-xs font-medium text-white" style={{ background: 'var(--primary)' }}>
          Retour
        </button>
      </div>
    )
  }

  if (!report) return null

  return (
    <div className="flex-1 flex flex-col bg-transparent">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={onBack} aria-label="Retour" className="p-2.5 rounded-xl">
          <ArrowLeft size={22} style={{ color: 'var(--text)' }} />
        </button>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Centre de compatibilité</h2>
      </header>

      <div className="flex-1 px-4 pb-8 overflow-y-auto space-y-6">
        {/* En-tête avec photo */}
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden ring-4" style={{ borderColor: 'var(--border)', boxShadow: '0 0 20px rgba(217,45,74,0.15)' }}>
              {report.targetPhoto ? (
                <Image src={report.targetPhoto} alt={report.targetName} width={80} height={80} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                  ?
                </div>
              )}
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Compatibilité avec {report.targetName}</h3>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Analyse basée sur vos profils et réponses
            </p>
          </div>
        </div>

        {/* Score global */}
        <div className="flex flex-col items-center gap-2 py-4">
          <ScoreGauge score={report.globalScore} size="lg" />
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {report.globalScore >= 75 ? 'Excellente compatibilité ✨' :
             report.globalScore >= 55 ? 'Bonne compatibilité' :
             report.globalScore >= 40 ? 'Compatibilité moyenne' :
             'Compatibilité à explorer'}
          </p>
        </div>

        {/* Points forts */}
        {report.topStrengths.length > 0 && (
          <div className="rounded-xl p-4 border" style={{ background: 'var(--glass-success-bg)', borderColor: 'var(--glass-success-border)' }}>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--success)' }}>
              <Sparkles size={16} /> Points forts
            </h4>
            <ul className="space-y-1.5">
              {report.topStrengths.map((s, i) => (
                <li key={i} className="text-xs flex items-start gap-2" style={{ color: 'var(--text)' }}>
                  <span style={{ color: 'var(--success)' }}>✦</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Différences */}
        {report.keyDifferences.length > 0 && (
          <div className="rounded-xl p-4 border" style={{ background: 'var(--warning-bg)', borderColor: 'rgba(251,191,36,0.15)' }}>
            <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--warning)' }}>Différences potentielles</h4>
            <ul className="space-y-1.5">
              {report.keyDifferences.map((d, i) => (
                <li key={i} className="text-xs flex items-start gap-2" style={{ color: 'var(--text)' }}>
                  <span style={{ color: 'var(--warning)' }}>△</span> {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Conseils */}
        {report.advice.length > 0 && (
          <div className="rounded-xl p-4 border" style={{ background: 'var(--glass-crimson-bg)', borderColor: 'var(--glass-crimson-border)' }}>
            <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--primary)' }}>Conseils pour mieux se connaître</h4>
            <ul className="space-y-1.5">
              {report.advice.map((a, i) => (
                <li key={i} className="text-xs flex items-start gap-2" style={{ color: 'var(--text)' }}>
                  💡 {a}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Détail par critère */}
        <div>
          <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Détail par critère</h4>
          <div className="space-y-3">
            {report.criteria.map((c) => (
              <CriteriaCard key={c.id} criterion={c} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
