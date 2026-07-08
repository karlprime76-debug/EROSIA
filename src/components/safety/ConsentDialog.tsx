'use client'

import { motion, AnimatePresence } from 'motion/react'
import { Shield, Check, X } from 'lucide-react'
import { FocusTrap } from '@/components/FocusTrap'

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
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 bg-theme/80 z-[110] flex items-center justify-center p-6 backdrop-blur-sm"
          onClick={onCancel}
          onKeyDown={e => { if (e.key === 'Escape') onCancel() }}
        >
          <FocusTrap>
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="glass rounded-2xl p-6 max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-theme">{title}</h2>
            </div>
            <p className="text-sm text-secondary mb-3 leading-relaxed">{description}</p>
            <p className="text-xs text-muted bg-surface rounded-lg p-3 mb-5 leading-relaxed">
              {contentLabel}
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={onCancel}
                className="flex-1 py-2.5 rounded-full text-sm font-medium border border-theme text-secondary hover:bg-surface transition-all duration-200 flex items-center justify-center gap-2">
                <X className="w-4 h-4" /> Annuler
              </button>
              <button type="button" onClick={onConfirm}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold text-on-primary bg-primary shadow-glow transition-all duration-200 flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Partager
              </button>
            </div>
            {onRevoke && (
              <button type="button" onClick={onRevoke}
                className="w-full mt-3 py-2 text-xs text-muted hover:text-secondary transition-colors">
                Retirer mon consentement
              </button>
            )}
          </motion.div>
          </FocusTrap>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
