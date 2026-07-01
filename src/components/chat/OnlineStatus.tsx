'use client'

import { motion } from 'motion/react'

export function OnlineStatus({ isOnline, size = 'sm', visibility }: {
  isOnline: boolean
  size?: 'sm' | 'md' | 'lg'
  visibility?: 'everyone' | 'matches' | 'nobody'
}) {
  const effective = visibility === 'nobody' ? false : isOnline
  const dim = size === 'sm' ? 8 : size === 'md' ? 10 : 14
  const outerDim = dim + 4
  return (
    <motion.div
      className="relative shrink-0"
      style={{ width: outerDim, height: outerDim }}
      initial={false}
    >
      <motion.div
        animate={{
          scale: effective ? [1, 1.2, 1] : 1,
          opacity: effective ? 1 : 0.4,
        }}
        transition={effective ? { repeat: Infinity, duration: 2 } : { duration: 0.3 }}
        className="rounded-full"
        style={{
          width: dim,
          height: dim,
          backgroundColor: effective ? 'var(--success)' : 'var(--text-muted)',
          boxShadow: effective ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
          margin: 2,
        }}
      />
    </motion.div>
  )
}

export function OnlineBadge({ isOnline, lastSeen, visibility }: { isOnline: boolean; lastSeen?: string | null; visibility?: 'everyone' | 'matches' | 'nobody' }) {
  const effective = visibility === 'nobody' ? false : isOnline
  return (
    <div className="flex items-center gap-1.5">
      <OnlineStatus isOnline={effective} size="sm" visibility={visibility} />
      <span className={`text-[10px] ${effective ? 'text-success' : 'text-muted'}`}>
        {effective ? 'En ligne' : lastSeen ? formatLastSeen(lastSeen) : 'Hors ligne'}
    </span>
    </div>
  )
}

function formatLastSeen(date: string) {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'À l\'instant'
  if (mins < 60) return `Il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Il y a ${hours}h`
  return `Il y a ${Math.floor(hours / 24)}j`
}
