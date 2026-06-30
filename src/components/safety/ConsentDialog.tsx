'use client'

import { motion, AnimatePresence } from 'motion/react'
import { Shield, Check, X } from 'lucide-react'

interface ConsentDialogProps {
  open: boolean
  title: string
  description: string
  contentLabel: string
  onConfirm: () => void
  onCancel: () => void
  onRevoke?: () => void
}

export default function ConsentDialog({
  open,
  title,
  description,
  contentLabel,
  onConfirm,
  onCancel,
  onRevoke,
}: ConsentDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-6 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="glass rounded-2xl p-6 max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#D92D4A]/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#D92D4A]" />
              </div>
              <h2 className="text-lg font-semibold text-[#F5F0EB]">{title}</h2>
            </div>
            <p className="text-sm text-[#A09890] mb-3 leading-relaxed">{description}</p>
            <p className="text-xs text-[#6B6258] bg-[#222225] rounded-lg p-3 mb-5 leading-relaxed">
              {contentLabel}
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={onCancel}
                className="flex-1 py-2.5 rounded-full text-sm font-medium border border-[#2C2A28] text-[#A09890] hover:bg-[#222225] transition-all duration-200 flex items-center justify-center gap-2">
                <X className="w-4 h-4" /> Annuler
              </button>
              <button type="button" onClick={onConfirm}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white shadow-[0_4px_16px_rgba(217,45,74,0.25)] hover:shadow-[0_6px_24px_rgba(217,45,74,0.35)] transition-all duration-200 flex items-center justify-center gap-2"
                style={{ background: '#D92D4A' }}>
                <Check className="w-4 h-4" /> Partager
              </button>
            </div>
            {onRevoke && (
              <button type="button" onClick={onRevoke}
                className="w-full mt-3 py-2 text-xs text-[#6B6258] hover:text-[#A09890] transition-colors">
                Retirer mon consentement
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
