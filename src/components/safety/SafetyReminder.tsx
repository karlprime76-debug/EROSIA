'use client'

import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle, X } from 'lucide-react'

interface SafetyReminderProps {
  open: boolean
  onDismiss: () => void
  onProceed: () => void
  type?: 'photo' | 'location' | 'contact'
}

const reminders = {
  photo: {
    title: 'Protège tes photos',
    message: 'Une fois partagée, une photo peut être copiée ou diffusée sans ton consentement. Ne partage que ce avec quoi tu es à l\'aise.',
    emoji: '📸',
  },
  location: {
    title: 'Protège ta localisation',
    message: 'Partager ta position exacte peut compromettre ta sécurité. Préfère un lieu public pour les premières rencontres.',
    emoji: '📍',
  },
  contact: {
    title: 'Protège tes coordonnées',
    message: 'Prends le temps de connaître la personne avant de partager ton numéro ou ton adresse. Utilise la messagerie Erosia.',
    emoji: '🔒',
  },
}

export default function SafetyReminder({ open, onDismiss, onProceed, type = 'photo' }: SafetyReminderProps) {
  const { title, message, emoji } = reminders[type]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 50, x: '-50%' }}
          role="alert"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 z-50 w-[90%] max-w-sm"
        >
          <div className="glass rounded-2xl p-4 border border-primary/30 shadow-elevated">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{emoji}</span>
                  <h3 className="text-sm font-semibold text-theme">{title}</h3>
                </div>
                <p className="text-xs text-secondary leading-relaxed mb-3">{message}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={onDismiss}
                    className="flex-1 py-2 rounded-full text-xs font-medium border border-theme text-secondary hover:bg-surface transition-all">
                    Annuler
                  </button>
                  <button type="button" onClick={onProceed}
                    className="flex-1 py-2 rounded-full text-xs font-semibold text-on-primary bg-primary transition-all">
                    Je comprends, continuer
                  </button>
                </div>
              </div>
              <button type="button" onClick={onDismiss}
                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-surface transition-colors shrink-0">
                <X className="w-3.5 h-3.5 text-muted" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
