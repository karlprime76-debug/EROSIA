'use client'

import { useState } from 'react'
import { Shield, ShieldOff, Loader2 } from 'lucide-react'

interface BlockButtonProps {
  userId: string
  userName: string
  isBlocked?: boolean
  onBlock: (userId: string) => Promise<boolean>
  onUnblock: (userId: string) => Promise<boolean>
  size?: 'sm' | 'md'
  showLabel?: boolean
}

export default function BlockButton({
  userId,
  userName,
  isBlocked = false,
  onBlock,
  onUnblock,
  size = 'md',
  showLabel = true,
}: BlockButtonProps) {
  const [loading, setLoading] = useState(false)
  const [blocked, setBlocked] = useState(isBlocked)
  const [confirm, setConfirm] = useState(false)

  const handleClick = async () => {
    if (!confirm && !blocked) {
      setConfirm(true)
      setTimeout(() => setConfirm(false), 4000)
      return
    }

    setLoading(true)
    setConfirm(false)

    const success = blocked ? await onUnblock(userId) : await onBlock(userId)
    if (success) setBlocked(!blocked)
    setLoading(false)
  }

  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-1.5 text-xs'
    : 'px-3 py-2 text-sm'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`${sizeClasses} rounded-lg font-medium transition-all duration-200 flex items-center gap-1.5 ${
        confirm
          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
          : blocked
            ? 'bg-[#222225] text-[#6B6258] border border-[#2C2A28]'
            : 'bg-[#222225] text-[#A09890] border border-[#2C2A28] hover:border-red-500/30 hover:text-red-400'
      }`}
      title={confirm ? `Confirmer le blocage de ${userName}` : blocked ? `Débloquer ${userName}` : `Bloquer ${userName}`}
    >
      {loading ? (
        <Loader2 className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      ) : blocked ? (
        <ShieldOff className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      ) : (
        <Shield className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      )}
      {showLabel && (confirm ? 'Confirmer le blocage ?' : blocked ? 'Débloqué' : 'Bloquer')}
    </button>
  )
}
