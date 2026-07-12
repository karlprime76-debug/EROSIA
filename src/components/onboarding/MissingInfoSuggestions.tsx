'use client'

import { useRouter } from 'next/navigation'
import { AlertCircle, ChevronRight } from 'lucide-react'
import { useOnboarding } from '@/lib/onboarding/provider'

export function MissingInfoSuggestions() {
  const { getMissingInfo } = useOnboarding()
  const missing = getMissingInfo()
  const router = useRouter()

  if (missing.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertCircle size={14} className="text-[var(--warning)]" />
        <p className="text-xs font-semibold text-secondary">
          Pour atteindre 100%, il te manque :
        </p>
      </div>
      <div className="space-y-1.5">
        {missing.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => router.push(`/onboarding?step=${item.step}`)}
            className="w-full flex items-center justify-between gap-2 p-3 rounded-2xl bg-surface border border-theme hover:border-[var(--primary)]/30 hover:bg-card transition-all duration-200 text-left group"
          >
            <span className="text-xs font-semibold text-theme">{item.label}</span>
            <ChevronRight size={14} className="text-muted group-hover:text-[var(--primary)] transition-colors duration-200 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
