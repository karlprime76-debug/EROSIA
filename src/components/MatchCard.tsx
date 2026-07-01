import { motion } from 'motion/react'
import Image from 'next/image'
import { Heart, MessageCircle, X } from 'lucide-react'
import { useConfirm } from '@/components/ConfirmDialog'
import { logger } from '@/lib/logger'
import { unmatchUser } from '@/lib/api'

export interface MatchCardProps {
  matchId: string
  profile: {
    id: string
    name: string
    photos?: string[]
  }
  index: number
}

export const MatchCard: React.FC<MatchCardProps> = ({ matchId, profile, index }) => {
  const { confirm } = useConfirm()

  const handleUnmatch = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (await confirm('Supprimer ce match ?')) {
      const { error } = await unmatchUser(matchId)
      if (error) {
        logger.error('unmatch failed', error)
        return
      }
      // The parent will refresh the list; no need to update here
    }
  }

  return (
    <motion.div
      className="flex items-center gap-3 p-3 glass-card rounded-2xl transition-all duration-200 hover:border-[var(--primary)]/20 active:scale-[0.98] group animate-slide-up"
      style={{ animationDelay: `${index * 80}ms` }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="relative shrink-0">
        {profile.photos?.[0] ? (
          <Image
            src={profile.photos[0]}
            alt={profile.name}
            width={56}
            height={56}
            className="rounded-full object-cover w-14 h-14 bg-[var(--surfaceElevated)] ring-2 ring-[var(--border)]"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-[var(--surfaceElevated)] ring-2 ring-[var(--border)] flex items-center justify-center">
            <Heart size={20} className="text-[var(--textMuted)]" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" title={profile.name}>
          {profile.name}
        </p>
        <p className="text-xs text-[var(--textSecondary)] truncate mt-0.5">Dites bonjour 👋</p>
      </div>
      <MessageCircle size={18} className="text-[var(--textMuted)] group-hover:text-[var(--primary)] transition-colors" />
      <button
        type="button"
        aria-label="Ne plus match"
        onClick={handleUnmatch}
        className="p-2.5 -mr-1 opacity-0 focus:opacity-100 group-hover:opacity-100 transition-opacity"
      >
        <X size={14} className="text-[var(--textMuted)] hover:text-[var(--errorVibrant)] transition-colors" />
      </button>
    </motion.div>
  )
}
