'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Flag, X, Send, Loader2, Check } from 'lucide-react'
import { FocusTrap } from '../FocusTrap'

const reasons = [
  { value: 'comportement_inapproprié', label: 'Comportement inapproprié' },
  { value: 'harcèlement', label: 'Harcèlement' },
  { value: 'contenu_offensant', label: 'Contenu offensant' },
  { value: 'faux_profil', label: 'Faux profil' },
  { value: 'demande_argent', label: 'Demande d\'argent' },
  { value: 'spam', label: 'Spam' },
  { value: 'autre', label: 'Autre' },
]

interface ReportSheetProps {
  open: boolean
  onClose: () => void
  onSubmit: (reason: string, description?: string) => Promise<void>
  reportedName: string
}

export default function ReportSheet({ open, onClose, onSubmit, reportedName }: ReportSheetProps) {
  const [selectedReason, setSelectedReason] = useState<string>('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    if (!selectedReason) return
    setLoading(true)
    await onSubmit(selectedReason, description || undefined)
    setLoading(false)
    setDone(true)
    setTimeout(() => {
      setDone(false)
      setSelectedReason('')
      setDescription('')
      onClose()
    }, 1500)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Signaler un utilisateur"
          className="fixed inset-0 bg-theme/80 z-[110] flex items-end sm:items-center justify-center backdrop-blur-sm"
          onClick={onClose}
          onKeyDown={e => { if (e.key === 'Escape') onClose() }}
        >
          <FocusTrap active={open}>
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-surface w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-warning/20 flex items-center justify-center">
                    <Flag className="w-4 h-4 text-warning" />
                  </div>
                  <h2 className="text-lg font-semibold text-theme">Signaler {reportedName}</h2>
                </div>
                <button type="button" onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface transition-colors">
                  <X className="w-4 h-4 text-secondary" />
                </button>
              </div>

              {done ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-success" />
                  </div>
                  <p className="text-sm text-theme font-medium">Signalement envoyé</p>
                  <p className="text-xs text-muted mt-1">Merci, notre équipe va examiner.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-secondary mb-4">
                    Ton signalement est anonyme. Pourquoi signales-tu {reportedName}&nbsp;?
                  </p>

                  <div className="space-y-2 mb-4">
                    {reasons.map(r => (
                      <button key={r.value} type="button"
                        onClick={() => setSelectedReason(r.value)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                          selectedReason === r.value
                        ? 'bg-primary/20 text-theme border border-primary/40'
                        : 'bg-surface text-secondary border border-transparent hover:border-theme'
                        }`}>
                        {r.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    placeholder="Ajoute des détails (optionnel)..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className="w-full bg-surface rounded-xl px-4 py-3 text-sm text-theme placeholder-muted border border-theme resize-none mb-4 focus:outline-none focus:border-primary/40 transition-colors"
                  />

                  <button type="button" onClick={handleSubmit} disabled={!selectedReason || loading}
                    className={`w-full py-2.5 rounded-full text-sm font-semibold text-on-primary transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 ${!selectedReason || loading ? 'bg-surface' : 'bg-primary'}`}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {loading ? 'Envoi...' : 'Envoyer le signalement'}
                  </button>
                </>
              )}
            </motion.div>
          </FocusTrap>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

