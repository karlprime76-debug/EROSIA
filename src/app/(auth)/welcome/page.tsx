'use client'

import Link from 'next/link'
import Image from 'next/image'
import { FloatingHearts } from '@/components/3d/FloatingHearts'
import { Flame, MessageCircle, Gift, MapPin, Shield, Star, ChevronRight } from 'lucide-react'

const features = [
  {
    icon: Flame, title: 'Découvre des profils', desc: 'Swipe à l\'infini et trouve des âmes passionnées près de chez toi.',
    color: '#D92D4A',
  },
  {
    icon: MessageCircle, title: 'Chat en temps réel', desc: 'Messages, photos, vocaux, vidéos, réactions et messages éphémères.',
    color: '#22C55E',
  },
  {
    icon: Gift, title: 'Boutique cadeaux', desc: 'Envoie des cadeaux virtuels avec paiement Mobile Money ou carte bancaire.',
    color: '#EAB308',
  },
  {
    icon: MapPin, title: 'Rencontres géolocalisées', desc: 'Trouve des profils autour de toi avec le mode voyage intégré.',
    color: '#3B82F6',
  },
  {
    icon: Shield, title: 'Comptes vérifiés', desc: 'Profils authentiques avec selfie, stories 24h, et mode fantôme.',
    color: '#A855F7',
  },
  {
    icon: Star, title: 'Duels & Quiz', desc: 'Amuse-toi avec les duels de profils et le quiz de personnalité.',
    color: '#D92D4A',
  },
]

export default function WelcomePage() {
  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden bg-transparent">
      <FloatingHearts />

      <div className="flex flex-col min-h-dvh px-6 sm:px-12 lg:px-16 xl:px-24
        lg:flex-row lg:items-center lg:justify-between lg:max-w-7xl lg:mx-auto lg:w-full relative z-10">

        <div className="flex flex-col items-center pt-16 pb-8 lg:pt-0 lg:items-start lg:flex-1 lg:pb-0">
          <Image src="/logo.png" alt="Erosia" width={200} height={66} className="mb-6 sm:w-56 lg:w-64 drop-shadow-[0_0_30px_rgba(217,45,74,0.5)] animate-pulse-glow" priority />

          <div className="relative animate-fade-up">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-3 leading-tight text-center lg:text-left">
              Là où les cœurs<br />
              <span className="sensual-text">se rencontrent</span>
            </h1>
            <div className="w-16 h-0.5 bg-gradient-to-r from-[#D92D4A] to-transparent mx-auto lg:mx-0 mt-2 animate-expand" />
          </div>

          <p className="text-white/50 text-base sm:text-lg mt-4 text-center lg:text-left max-w-md leading-relaxed animate-fade-up" style={{ animationDelay: '150ms' }}>
            Erosia est l&rsquo;appli de rencontres sensuelles qui réveille vos désirs.
            Profiles vérifiés, chat riche, cadeaux, duels, stories éphémères —
            tout est pensé pour des connexions vraies et passionnées.
          </p>
        </div>

        <div className="flex flex-col items-center gap-8 pb-16 lg:flex-1 lg:items-start lg:gap-10">
          <div className="w-full max-w-sm lg:max-w-md space-y-3">
            {features.map(({ icon: Icon, title, desc, color }, i) => (
              <div key={title}
                className="group glass-card rounded-2xl px-5 py-4 flex items-center gap-4 cursor-default transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(217,45,74,0.15)]"
                style={{ animation: `fadeUp 0.6s ${(i + 1) * 100}ms both` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110"
                  style={{ background: `${color}15` }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{title}</p>
                  <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{desc}</p>
                </div>
                <ChevronRight size={14} className="text-white/10 group-hover:text-white/30 transition-all duration-300 group-hover:translate-x-0.5" />
              </div>
            ))}
          </div>

          <div className="w-full max-w-sm flex flex-col gap-3 lg:max-w-md" style={{ animation: 'fadeUp 0.6s 700ms both' }}>
            <Link
              href="/register"
              className="group w-full py-4 rounded-full text-center font-semibold text-base sm:text-lg transition-all duration-300 active:scale-95 hover:shadow-[0_0_40px_rgba(217,45,74,0.4)] relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #D92D4A, #A8102A)' }}>
              <span className="relative z-10 text-white">Commencer l&rsquo;aventure</span>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'linear-gradient(135deg, #FF2D55, #D92D4A)' }} />
            </Link>
            <Link
              href="/login"
              className="w-full py-4 rounded-full border border-white/10 text-center font-semibold text-base sm:text-lg text-white/60 transition-all duration-300 active:scale-95 hover:border-white/25 hover:text-white hover:bg-white/5">
              J&rsquo;ai déjà un compte
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
