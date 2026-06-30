'use client'

import { MessageCircle, Shield, Heart, Sun, Calendar, Target } from 'lucide-react'
import type { CriterionResultWithMeta } from '@/lib/engine/compat-center/types'

const ICON_MAP: Record<string, React.ComponentType<{ size: number; style?: React.CSSProperties }>> = {
  MessageCircle, Shield, Heart, Sun, Calendar, Target,
}

function getColor(score: number): string {
  if (score >= 75) return '#34D399'
  if (score >= 50) return '#D92D4A'
  if (score >= 30) return '#F87171'
  return '#6B6258'
}

export function CriteriaCard({ criterion }: { criterion: CriterionResultWithMeta }) {
  const Icon = ICON_MAP[criterion.icon] ?? MessageCircle
  const color = getColor(criterion.score)

  return (
    <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl" style={{ background: 'var(--glass-crimson-bg)' }}>
            <Icon size={16} style={{ color }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{criterion.label}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{criterion.description}</p>
          </div>
        </div>
        <span className="text-lg font-bold" style={{ color }}>{criterion.score}%</span>
      </div>

      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${criterion.score}%`, background: color }} />
      </div>

      {criterion.strengths.length > 0 && (
        <div className="mt-3 space-y-1">
          {criterion.strengths.map((s, i) => (
            <p key={i} className="text-[11px] flex items-start gap-1.5" style={{ color: 'var(--success)' }}>
              <span className="mt-0.5 shrink-0">✦</span> {s}
            </p>
          ))}
        </div>
      )}

      {criterion.differences.length > 0 && (
        <div className="mt-2 space-y-1">
          {criterion.differences.map((d, i) => (
            <p key={i} className="text-[11px] flex items-start gap-1.5" style={{ color: 'var(--warning)' }}>
              <span className="mt-0.5 shrink-0">△</span> {d}
            </p>
          ))}
        </div>
      )}

      {criterion.tips.length > 0 && (
        <div className="mt-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Conseils</p>
          {criterion.tips.map((t, i) => (
            <p key={i} className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>💡 {t}</p>
          ))}
        </div>
      )}
    </div>
  )
}
