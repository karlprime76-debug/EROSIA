'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, Mail } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

const faqs = [
  {
    q: 'Comment fonctionne Erosia ?',
    a: 'Erosia est une application de rencontres premium. Découvre des profils, swipe pour matcher, puis discute avec tes matchs en temps réel. Les fonctionnalités Premium débloquent le mode voyage, le mode fantôme, et plus encore.',
  },
  {
    q: 'Erosia est-elle gratuite ?',
    a: 'L\'inscription et les fonctionnalités de base sont gratuites : discovery, matching, messagerie. L\'abonnement Premium à 5 000 CFA/mois débloque le mode voyage, le mode fantôme, les super likes illimités et la priorité dans les suggestions.',
  },
  {
    q: 'Comment modifier mon profil ?',
    a: 'Rends-toi sur la page "Profil" depuis le menu du bas. Tu peux modifier ton nom, ta bio, tes photos, tes centres d\'intérêt, ton humeur et ton type de relation recherchée.',
  },
  {
    q: 'Comment supprimer mon compte ?',
    a: 'Va dans "Paramètres" depuis la page Profil, puis clique sur "Supprimer mon compte" dans la section Compte. La suppression est immédiate et irréversible.',
  },
  {
    q: 'Mes données sont-elles protégées ?',
    a: 'Oui. Tu peux gérer ta confidentialité depuis "Confidentialité" dans le menu Profil : qui peut te voir, masquer ton âge ou ta distance, contrôler les stories, le statut en ligne et les confirmations de lecture.',
  },
  {
    q: 'Comment contacter le support ?',
    a: 'Écris-nous à erosiahelp@hotmail.com. Notre équipe répond sous 24 à 48 heures ouvrées.',
  },
  {
    q: 'Puis-je récupérer mon compte après l\'avoir supprimé ?',
    a: 'Non, la suppression est définitive. Si tu souhaites simplement faire une pause, tu peux masquer ton profil depuis les paramètres de confidentialité.',
  },
  {
  },
  {
    q: 'Les suggestions de date sont-elles personnalisées ?',
    a: 'Oui ! Depuis une conversation, clique sur "Idée de date" dans le menu. L\'IA génère des suggestions basées sur vos centres d\'intérêt communs, vos humeurs et votre distance.',
  },
]

export default function FaqPage() {
  const router = useRouter()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="flex-1 flex flex-col bg-transparent">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="Retour" className="p-1">
          <ArrowLeft size={22} style={{ color: 'var(--text)' }} />
        </button>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>FAQ</h2>
      </header>

      <div className="flex-1 px-4 space-y-6 pb-8 overflow-y-auto">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Retrouve les réponses aux questions les plus fréquentes.
        </p>

        <div className="space-y-2">
          {faqs.map((faq, i) => {
            const open = openIndex === i
            return (
              <div key={i} className="rounded-xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3.5 text-left"
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{faq.q}</span>
                  {open ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                </button>
                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-3.5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        <div className="rounded-xl p-5 text-center" style={{ background: 'var(--glass-crimson-bg)', border: '1px solid var(--glass-crimson-border)' }}>
          <Mail size={24} style={{ color: 'var(--primary)' }} className="mx-auto mb-2" />
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Besoin d&apos;aide ?</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Notre équipe te répond sous 24-48h</p>
          <a href="mailto:erosiahelp@hotmail.com"
            className="inline-block mt-3 px-4 py-2 rounded-lg text-xs font-medium text-white"
            style={{ background: 'var(--primary)' }}>
            erosiahelp@hotmail.com
          </a>
        </div>
      </div>
    </div>
  )
}
