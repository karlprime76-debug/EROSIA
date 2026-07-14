'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Film, Calendar, Gift, Bot, Settings, HelpCircle, FileText, Shield, LogOut, Sparkles, PartyPopper, X, Loader } from 'lucide-react'
import { FocusTrap } from '@/components/FocusTrap'
import { signOut } from '@/lib/api'
import { useToast } from '@/components/Toast'

interface MoreMenuProps {
  onClose: () => void
}

const items = [
  { href: '/stories', icon: Film, label: 'Stories' },
  { href: '/dates', icon: Calendar, label: 'Rendez-vous' },
  { href: '/events', icon: PartyPopper, label: 'Événements' },
  { href: '/gifts', icon: Gift, label: 'Boutique' },
  { href: '/coach', icon: Bot, label: 'Assistant IA' },
  { href: '/settings', icon: Settings, label: 'Paramètres' },
  { href: '/faq', icon: HelpCircle, label: 'Aide' },
  { href: '/cgu', icon: FileText, label: 'Conditions' },
  { href: '/privacy', icon: Shield, label: 'Confidentialité' },
  { href: '/safety', icon: Sparkles, label: 'Sécurité' },
]

export function MoreMenu({ onClose }: MoreMenuProps) {
  const { toast } = useToast()
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const handleNavigation = () => {
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <FocusTrap>
        <div className="relative w-full max-w-sm bg-[var(--card)] rounded-t-3xl sm:rounded-3xl max-h-[80vh] overflow-y-auto border border-[var(--border)] mx-3">
          <div className="sticky top-0 bg-[var(--card)] z-10 flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--border)]">
            <h2 className="font-semibold text-lg">Plus</h2>
            <button type="button" onClick={onClose} aria-label="Fermer" className="p-2.5 rounded-xl">
              <X size={20} />
            </button>
          </div>

          <div className="p-3 space-y-0.5">
            {items.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href} onClick={handleNavigation}
                className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl hover:bg-[var(--surface)] transition-colors group">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface)] flex items-center justify-center group-hover:bg-[var(--surfaceElevated)] transition-colors">
                  <Icon size={18} className="text-[var(--textSecondary)]" />
                </div>
                <span className="text-sm font-medium text-[var(--textPrimary)]">{label}</span>
              </Link>
            ))}
          </div>

          <div className="border-t border-[var(--border)] p-3">
            <button type="button" onClick={() => { (async () => {
              if (signingOut) return
              setSigningOut(true)
              await signOut().catch(() => { toast('Erreur lors de la déconnexion', 'error'); setSigningOut(false) })
            })() }} disabled={signingOut}
              className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl hover:bg-[var(--surface)] transition-colors w-full text-left group disabled:opacity-40">
              <div className="w-9 h-9 rounded-xl bg-error/10 flex items-center justify-center">
                {signingOut ? <Loader size={18} className="animate-spin text-error" /> : <LogOut size={18} className="text-error" />}
              </div>
              <span className="text-sm font-medium text-error">{signingOut ? 'Déconnexion...' : 'Déconnexion'}</span>
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  )
}
