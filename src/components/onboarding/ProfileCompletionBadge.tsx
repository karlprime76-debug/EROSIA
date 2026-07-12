'use client'

import { useOnboarding } from '@/lib/onboarding/provider'

type BadgeSize = 'sm' | 'md' | 'lg'

const SIZE_MAP: Record<BadgeSize, { container: string; svg: string; text: string; radius: number; stroke: number }> = {
  sm: { container: 'w-10 h-10', svg: 'w-10 h-10', text: 'text-[10px]', radius: 16, stroke: 3 },
  md: { container: 'w-16 h-16', svg: 'w-16 h-16', text: 'text-sm', radius: 26, stroke: 4 },
  lg: { container: 'w-24 h-24', svg: 'w-24 h-24', text: 'text-lg', radius: 40, stroke: 5 },
}

function getColor(pct: number): string {
  if (pct >= 80) return 'var(--success)'
  if (pct >= 60) return 'var(--warning)'
  if (pct >= 30) return '#F59E0B'
  return 'var(--error)'
}

export function ProfileCompletionBadge({ size = 'md' }: { size?: BadgeSize }) {
  const { completionPercentage } = useOnboarding()
  const s = SIZE_MAP[size]
  const circumference = 2 * Math.PI * s.radius
  const dash = (completionPercentage / 100) * circumference

  return (
    <div className={`relative ${s.container} flex items-center justify-center`}>
      <svg className={`${s.svg} -rotate-90`} viewBox={`0 0 ${(s.radius + s.stroke) * 2} ${(s.radius + s.stroke) * 2}`}>
        <circle
          cx={s.radius + s.stroke}
          cy={s.radius + s.stroke}
          r={s.radius}
          fill="none"
          stroke="var(--surface)"
          strokeWidth={s.stroke}
        />
        <circle
          cx={s.radius + s.stroke}
          cy={s.radius + s.stroke}
          r={s.radius}
          fill="none"
          stroke={getColor(completionPercentage)}
          strokeWidth={s.stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`${s.text} font-bold text-theme tabular-nums`}>
          {completionPercentage}%
        </span>
      </div>
    </div>
  )
}
