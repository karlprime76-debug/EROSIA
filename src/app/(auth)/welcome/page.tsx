'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { FloatingHearts } from '@/components/3d/FloatingHearts'
import { Flame, MessageCircle, Gift, MapPin, Shield, Star, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  { icon: Flame, title: 'Découvre des profils', desc: 'Swipe et trouve des âmes passionnées près de chez toi.',
    color: '#D92D4A', glow: 'rgba(217,45,74,0.12)' },
  { icon: MessageCircle, title: 'Chat en temps réel', desc: 'Messages, photos, vocaux, réactions et messages éphémères.',
    color: '#34D399', glow: 'rgba(52,211,153,0.1)' },
  { icon: Gift, title: 'Boutique cadeaux', desc: 'Envoie des cadeaux virtuels. Mobile Money ou carte bancaire.',
    color: '#FBBF24', glow: 'rgba(251,191,36,0.1)', badge: 'Nouveau' },
  { icon: MapPin, title: 'Rencontres géolocalisées', desc: 'Trouve des profils autour de toi avec le mode voyage.',
    color: '#60A5FA', glow: 'rgba(96,165,250,0.1)' },
  { icon: Shield, title: 'Profils vérifiés', desc: 'Authentifiés par selfie. Stories 24h et mode fantôme.',
    color: '#A78BFA', glow: 'rgba(167,139,250,0.1)' },
  { icon: Star, title: 'Duels & Quiz', desc: 'Amuse-toi avec les duels de profils et le quiz de personnalité.',
    color: '#F472B6', glow: 'rgba(244,114,182,0.1)' },
]

export default function WelcomePage() {
  const router = useRouter()
  return (
    <div className="relative min-h-dvh flex flex-col overflow-hidden bg-[var(--bg)]">
      <FloatingHearts />

      <div className="relative z-10 flex flex-col min-h-dvh px-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:max-w-6xl lg:mx-auto lg:w-full lg:px-10">
        {/* Hero */}
        <div className="flex flex-col items-center pt-16 pb-6 lg:pt-0 lg:items-start lg:flex-1 lg:pb-0 lg:pr-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 mb-8"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--primary-light)] to-[var(--primary-dark)] flex items-center justify-center shadow-[var(--shadow-glow)]">
              <Sparkles size={20} className="text-white" />
            </div>
            <span className="text-3xl font-bold text-[var(--text)] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Erosia
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="text-[clamp(2rem,5vw,3.5rem)] font-bold text-[var(--text)] mb-4 leading-[1.1] tracking-[-0.03em] text-center lg:text-left"
          >
            Là où les cœurs<br />
            <span className="text-gradient-primary">se rencontrent</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
            className="w-16 h-[3px] bg-gradient-to-r from-[var(--primary)] via-[var(--accent-warm)] to-transparent rounded-full mb-5 mx-auto lg:mx-0"
          />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
            className="text-[var(--text-secondary)] text-base sm:text-lg text-center lg:text-left max-w-md leading-relaxed"
          >
            L&rsquo;appli qui réveille vos désirs.
            Profils vérifiés, chat riche, cadeaux, duels —
            des connexions authentiques.
          </motion.p>
        </div>

        {/* Features + CTA */}
        <div className="flex flex-col items-center gap-5 pb-12 lg:flex-1 lg:items-start lg:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            className="w-full max-w-sm lg:max-w-md space-y-2"
          >
            {features.map(({ icon: Icon, title, desc, color, glow, badge }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.35 + i * 0.06 }}
                className="group rounded-xl px-4 py-3 flex items-center gap-3 cursor-default transition-all duration-300 hover:scale-[1.005]"
                style={{ background: `linear-gradient(135deg, ${glow}, transparent)`, border: `1px solid ${color}12` }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-sm"
                  style={{ background: `${color}12` }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[var(--text)] font-semibold text-sm">{title}</p>
                    {badge && (
                      <span className="text-[8px] font-bold text-[#FBBF24] px-1.5 py-0.5 rounded-full bg-[#FBBF24]/12 border border-[#FBBF24]/20 uppercase tracking-wider">
                        {badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--text-muted)] text-xs mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.65 }}
            className="w-full max-w-sm lg:max-w-md glass-crimson rounded-xl p-4 flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FBBF24] to-[var(--primary)] flex items-center justify-center shrink-0 shadow-[0_0_14px_rgba(251,191,36,0.15)]">
              <Gift size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[var(--text)] font-semibold text-sm">Offre-lui un cadeau</p>
              <p className="text-[var(--text-muted)] text-xs mt-0.5">Attire son attention. Mobile Money ou carte.</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.75 }}
            className="w-full max-w-sm lg:max-w-md flex flex-col gap-2.5"
          >
            <Button variant="premium" size="pill-lg" className="w-full text-base" onClick={() => router.push('/register')}>
              Commencer l&rsquo;aventure
              <ArrowRight size={18} />
            </Button>
            <Button variant="ghost" size="pill-lg" className="w-full text-sm" onClick={() => router.push('/login')}>
              J&rsquo;ai déjà un compte
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
