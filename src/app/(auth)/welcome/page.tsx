'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { FloatingHearts } from '@/components/3d/FloatingHearts'
import { Flame, MessageCircle, Gift, MapPin, Shield, Star, Sparkles } from 'lucide-react'

const features = [
  { icon: Flame, title: 'Découvre des profils', desc: 'Swipe à l\'infini et trouve des âmes passionnées près de chez toi.',
    color: '#D92D4A', glow: 'rgba(217,45,74,0.15)' },
  { icon: MessageCircle, title: 'Chat en temps réel', desc: 'Messages, photos, vocaux, vidéos, réactions et messages éphémères.',
    color: '#34D399', glow: 'rgba(52,211,153,0.12)' },
  { icon: Gift, title: 'Boutique cadeaux', desc: 'Envoie des cadeaux virtuels avec paiement Mobile Money ou carte bancaire.',
    color: '#FBBF24', glow: 'rgba(251,191,36,0.15)', badge: 'Populaire' },
  { icon: MapPin, title: 'Rencontres géolocalisées', desc: 'Trouve des profils autour de toi avec le mode voyage intégré.',
    color: '#60A5FA', glow: 'rgba(96,165,250,0.12)' },
  { icon: Shield, title: 'Comptes vérifiés', desc: 'Profils authentiques avec selfie, stories 24h, et mode fantôme.',
    color: '#A78BFA', glow: 'rgba(167,139,250,0.12)' },
  { icon: Star, title: 'Duels & Quiz', desc: 'Amuse-toi avec les duels de profils et le quiz de personnalité.',
    color: '#F472B6', glow: 'rgba(244,114,182,0.12)' },
]

export default function WelcomePage() {
  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden bg-transparent">
      <FloatingHearts />

      <div className="flex flex-col min-h-dvh px-6 sm:px-10 lg:px-16
        lg:flex-row lg:items-center lg:justify-between lg:max-w-6xl lg:mx-auto lg:w-full relative z-10">

        {/* Hero section */}
        <div className="flex flex-col items-center pt-20 pb-8 lg:pt-0 lg:items-start lg:flex-1 lg:pb-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D92D4A] to-[#A8102A] flex items-center justify-center shadow-[0_0_20px_rgba(217,45,74,0.3)]">
              <Sparkles size={22} className="text-white" />
            </div>
            <span className="text-3xl sm:text-4xl font-bold text-[#F5F0EB] tracking-tight" style={{ fontFamily: 'var(--font-playfair)' }}>Erosia</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="mb-6"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#F5F0EB] mb-4 leading-tight text-center lg:text-left tracking-tight">
              Là où les cœurs<br />
              <span className="text-gradient-primary">se rencontrent</span>
            </h1>
            <div className="w-20 h-1 bg-gradient-to-r from-[#D92D4A] via-[#E8A87C] to-transparent rounded-full mx-auto lg:mx-0" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
            className="text-[#A09890] text-base sm:text-lg mt-4 text-center lg:text-left max-w-md leading-relaxed"
          >
            L&rsquo;appli de rencontres qui réveille vos désirs.
            Profils vérifiés, chat riche, cadeaux, duels, stories éphémères —
            tout est pensé pour des connexions authentiques.
          </motion.p>
        </div>

        {/* Features + CTA */}
        <div className="flex flex-col items-center gap-6 pb-20 lg:flex-1 lg:items-start lg:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            className="w-full max-w-sm lg:max-w-md space-y-2.5"
          >
            {features.map(({ icon: Icon, title, desc, color, glow, badge }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.35 + i * 0.08 }}
                className="group rounded-2xl px-4 py-3.5 flex items-center gap-3.5 cursor-default transition-all duration-300 hover:scale-[1.01]"
                style={{ background: `linear-gradient(135deg, ${glow}, transparent)`, border: `1px solid ${color}15` }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110"
                  style={{ background: `${color}15` }}>
                  <Icon size={17} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[#F5F0EB] font-semibold text-sm">{title}</p>
                    {badge && (
                      <span className="text-[9px] font-bold text-[#FBBF24] px-1.5 py-0.5 rounded-full bg-[#FBBF24]/15 border border-[#FBBF24]/20">
                        {badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[#6B6560] text-xs mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.7 }}
            className="w-full max-w-sm lg:max-w-md glass-crimson rounded-2xl p-5 flex items-center gap-4"
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FBBF24] to-[#D92D4A] flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(251,191,36,0.2)]">
              <Gift size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#F5F0EB] font-bold text-sm">Offre-lui un cadeau</p>
              <p className="text-[#6B6560] text-xs mt-0.5">Attire son attention avec un cadeau virtuel. Mobile Money ou carte.</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.8 }}
            className="w-full max-w-sm flex flex-col gap-3 lg:max-w-md"
          >
            <Link
              href="/register"
              className="group relative w-full py-3.5 rounded-full text-center font-semibold text-base text-white overflow-hidden
                bg-[#D92D4A] shadow-[0_4px_24px_rgba(217,45,74,0.3)]
                hover:shadow-[0_6px_32px_rgba(217,45,74,0.5)]
                active:scale-[0.97] transition-all duration-300"
            >
              <span className="relative z-10">Commencer l&rsquo;aventure</span>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[linear-gradient(135deg,#FF3B5C,#D92D4A)]" />
            </Link>
            <Link
              href="/login"
              className="w-full py-3.5 rounded-full border border-[#2C2A28] text-center font-semibold text-sm text-[#A09890]
                transition-all duration-300 active:scale-[0.97] hover:border-[#D92D4A]/30 hover:text-[#F5F0EB] hover:bg-[#222225]"
            >
              J&rsquo;ai déjà un compte
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
