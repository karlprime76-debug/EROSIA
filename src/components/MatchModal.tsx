'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'motion/react'
import { Heart } from 'lucide-react'
import dynamic from 'next/dynamic'
import { FocusTrap } from '@/components/FocusTrap'
import type { Profile } from '@/lib/api'

const MatchBurst = dynamic(() => import('@/components/3d/MatchBurst').then(m => ({ default: m.MatchBurst })), { ssr: false })

interface MatchModalProps {
  matchModal: { profile: Profile; matchId: string } | null
  myPhoto: string | null
  onClose: () => void
}

export function MatchModal({ matchModal, myPhoto, onClose }: MatchModalProps) {
  const router = useRouter()

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!matchModal) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      aria-hidden="true"
      role="presentation"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 bg-theme/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <MatchBurst />
      <FocusTrap>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl text-center shadow-elevated"
        style={{
          background: 'linear-gradient(160deg, var(--surface) 0%, var(--bg) 100%)',
          border: '1px solid var(--borderLight)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[var(--primary)]/12 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-[var(--primary)] blur-3xl opacity-10 pointer-events-none" />

        <div className="relative z-10 p-8 space-y-5">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 16, delay: 0.1 }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primaryDark)] mx-auto flex items-center justify-center shadow-[0_0_48px_rgba(217,45,74,0.35)] border-2 border-[var(--borderLight)]"
          >
            <Heart size={36} className="text-[var(--textOnPrimary)]" fill="var(--textOnPrimary)" />
          </motion.div>

          <div>
            <h2 className="text-3xl font-bold text-[var(--textPrimary)] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>C&rsquo;est un match !</h2>
            <p className="text-[var(--textSecondary)] text-sm mt-1">Vous vous êtes mutuellement likés ✨</p>
          </div>

          <div className="flex items-center justify-center gap-3 py-2">
            {myPhoto
              ? <Image src={myPhoto} alt="Vous" width={76} height={76} className="w-[76px] h-[76px] rounded-full border-2 border-[var(--primary)] object-cover shadow-[0_0_20px_rgba(217,45,74,0.2)]" />
              : <div className="w-[76px] h-[76px] rounded-full bg-[var(--surfaceElevated)] flex items-center justify-center text-[var(--textMuted)] text-2xl border border-[var(--borderLight)]">?</div>}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Heart size={22} className="text-[var(--primary)]" fill="var(--primary)" />
            </motion.div>
            {matchModal.profile.photos?.[0]
              ? <Image src={matchModal.profile.photos[0]} alt={matchModal.profile.name} width={76} height={76} className="w-[76px] h-[76px] rounded-full border-2 border-[var(--primary)] object-cover shadow-[0_0_20px_rgba(217,45,74,0.2)]" />
              : <div className="w-[76px] h-[76px] rounded-full bg-[var(--surfaceElevated)] flex items-center justify-center text-[var(--textMuted)] text-2xl border border-[var(--borderLight)]">?</div>}
          </div>

          <p className="font-semibold text-[var(--textPrimary)] text-lg">{matchModal.profile.name}</p>

          <div className="space-y-2 pt-1">
            <button type="button" onClick={() => { router.push(`/chat/${matchModal.matchId}`); onClose() }}
              className="w-full py-4 rounded-2xl text-[var(--textOnPrimary)] font-bold text-sm tracking-wide transition-all duration-300 active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, var(--primary), var(--primaryDark))',
                boxShadow: '0 8px 32px rgba(217,45,74,0.3)',
              }}>
              💬 Envoyer un message
            </button>
            <button type="button" onClick={onClose}
              className="w-full py-3 text-[var(--textMuted)] text-sm hover:text-[var(--textPrimary)] transition-colors duration-200">
              Continuer à explorer
            </button>
          </div>
        </div>
      </motion.div>
      </FocusTrap>
    </motion.div>
  )
}
