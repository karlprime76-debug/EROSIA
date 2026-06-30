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
          className="fixed inset-0 bg-black/80 z-[110] flex items-end sm:items-center justify-center backdrop-blur-sm"
          onClick={onClose}
        >
          <FocusTrap active={open}>
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-[#1A1A1D] w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Flag className="w-4 h-4 text-amber-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-[#F5F0EB]">Signaler {reportedName}</h2>
                </div>
                <button type="button" onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#2C2A28] transition-colors">
                  <X className="w-4 h-4 text-[#A09890]" />
                </button>
              </div>

              {done ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-sm text-[#F5F0EB] font-medium">Signalement envoyé</p>
                  <p className="text-xs text-[#6B6258] mt-1">Merci, notre équipe va examiner.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-[#A09890] mb-4">
                    Ton signalement est anonyme. Pourquoi signales-tu {reportedName}&nbsp;?
                  </p>

                  <div className="space-y-2 mb-4">
                    {reasons.map(r => (
                      <button key={r.value} type="button"
                        onClick={() => setSelectedReason(r.value)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                          selectedReason === r.value
                            ? 'bg-[#D92D4A]/20 text-[#F5F0EB] border border-[#D92D4A]/40'
                            : 'bg-[#222225] text-[#A09890] border border-transparent hover:border-[#2C2A28]'
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
                    className="w-full bg-[#222225] rounded-xl px-4 py-3 text-sm text-[#F5F0EB] placeholder-[#6B6258] border border-[#2C2A28] resize-none mb-4 focus:outline-none focus:border-[#D92D4A]/40 transition-colors"
                  />

                  <button type="button" onClick={handleSubmit} disabled={!selectedReason || loading}
                    className="w-full py-2.5 rounded-full text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40"
                    style={{ background: !selectedReason || loading ? '#2C2A28' : '#D92D4A' }}>
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

