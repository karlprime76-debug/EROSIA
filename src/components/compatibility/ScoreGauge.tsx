'use client'

export function ScoreGauge({ score, size = 'lg' }: { score: number; size?: 'sm' | 'lg' }) {
  const radius = size === 'lg' ? 72 : 48
  const stroke = size === 'lg' ? 10 : 7
  const normalized = Math.min(100, Math.max(0, score))
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - normalized / 100)

  const color = normalized >= 75 ? 'var(--successVibrant)' : normalized >= 50 ? 'var(--primary)' : normalized >= 30 ? 'var(--warningVibrant)' : 'var(--textMuted)'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: radius * 2 + stroke, height: radius * 2 + stroke }}>
      <svg width={radius * 2 + stroke} height={radius * 2 + stroke} className="-rotate-90">
        <circle cx={radius + stroke / 2} cy={radius + stroke / 2} r={radius}
          stroke="var(--border)" strokeWidth={stroke} fill="none" />
        <circle cx={radius + stroke / 2} cy={radius + stroke / 2} r={radius}
          stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s' }} />
      </svg>
      <span className="absolute text-3xl font-bold" style={{ color: 'var(--textPrimary)' }}>
        {normalized}%
      </span>
    </div>
  )
}
