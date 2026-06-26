'use client'

import Link from 'next/link'
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
          <div className="mb-6 flex items-center gap-3 animate-pulse-glow">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="#D92D4A"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Erosia</span>
          </div>

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
            {features.map(({ icon: Icon, title, desc, color }, i) => {
              const isGift = title === 'Boutique cadeaux'
              return (
                <div key={title}
                  className={`group rounded-2xl px-5 py-4 flex items-center gap-4 cursor-default transition-all duration-500 hover:scale-[1.02] ${isGift ? 'bg-gradient-to-r from-[#EAB308]/10 via-[#EAB308]/5 to-transparent border border-[#EAB308]/20 shadow-[0_0_30px_rgba(234,179,8,0.1)]' : 'glass-card hover:shadow-[0_0_25px_rgba(217,45,74,0.15)]'}`}
                  style={{ animation: `fadeUp 0.6s ${(i + 1) * 100}ms both` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 relative"
                    style={{ background: `${color}15` }}>
                    <Icon size={18} style={{ color }} />
                    {isGift && <span className="absolute -top-1.5 -right-1.5 text-[8px]">🔥</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold text-sm">{title}</p>
                      {isGift && <span className="text-[10px] text-[#EAB308] font-bold px-1.5 py-0.5 rounded-full bg-[#EAB308]/15">Populaire</span>}
                    </div>
                    <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                  <ChevronRight size={14} className="text-white/10 group-hover:text-white/30 transition-all duration-300 group-hover:translate-x-0.5" />
                </div>
              )
            })}
          </div>

          <div className="w-full max-w-sm lg:max-w-md glass-card rounded-2xl p-5 flex items-center gap-4 border border-[#EAB308]/10"
            style={{ animation: 'fadeUp 0.6s 700ms both' }}>
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#EAB308] to-[#D92D4A] flex items-center justify-center shrink-0 animate-pulse-soft">
              <Gift size={22} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">Offre-lui un cadeau</p>
              <p className="text-white/50 text-xs mt-0.5">Attire son attention immédiatement avec un cadeau virtuel. Mobile Money ou carte.</p>
            </div>
          </div>

          <div className="w-full max-w-sm flex flex-col gap-3 lg:max-w-md" style={{ animation: 'fadeUp 0.6s 800ms both' }}>
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
