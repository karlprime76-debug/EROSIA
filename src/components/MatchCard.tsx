import { motion } from 'motion'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, MessageCircle, X } from 'lucide-react'
import { AuraSphere } from '@/components/AuraSphere'
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
      className="flex items-center gap-3 p-3 glass-card rounded-2xl transition-all duration-200 hover:border-[#D92D4A]/20 active:scale-[0.98] group animate-slide-up"
      style={{ animationDelay: `${index * 80}ms` }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="relative shrink-0">
        {profile.photos?.[0] ? (
          <>
            <AuraSphere aura={profile.id} size={70} className="absolute inset-0" />
            <Image
              src={profile.photos[0]}
              alt={profile.name}
              width={56}
              height={56}
              className="rounded-full object-cover w-14 h-14 bg-[#262628] ring-2 ring-[#2A2826]"
            />
          </>
        ) : (
          <div className="w-14 h-14 rounded-full bg-[#262628] ring-2 ring-[#2A2826] flex items-center justify-center">
            <Heart size={20} className="text-[#5A5248]" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" title={profile.name}>
          {profile.name}
        </p>
        <p className="text-xs text-[#9E9488] truncate mt-0.5">Dites bonjour 👋</p>
      </div>
      <MessageCircle size={18} className="text-[#5A5248] group-hover:text-[#D92D4A] transition-colors" />
      <button
        type="button"
        aria-label="Ne plus match"
        onClick={handleUnmatch}
        className="p-2.5 -mr-1 opacity-0 focus:opacity-100 group-hover:opacity-100 transition-opacity"
      >
        <X size={14} className="text-[#5A5248] hover:text-red-500 transition-colors" />
      </button>
    </motion.div>
  )
}
