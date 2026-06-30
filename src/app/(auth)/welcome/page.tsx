'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { Flame, MessageCircle, Gift, MapPin, Shield, Star, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  { 
    icon: Flame, 
    title: 'Découvre des profils', 
    desc: 'Swipe et trouve des âmes passionnées près de chez toi.',
    color: '#D92D4A', 
    glow: 'rgba(217,45,74,0.06)' 
  },
  { 
    icon: MessageCircle, 
    title: 'Chat en temps réel', 
    desc: 'Messages riches, vocaux, réactions et chat éphémère.',
    color: '#34D399', 
    glow: 'rgba(52,211,153,0.05)' 
  },
  { 
    icon: Gift, 
    title: 'Boutique cadeaux', 
    desc: 'Envoie des cadeaux virtuels via Mobile Money ou carte.',
    color: '#FBBF24', 
    glow: 'rgba(251,191,36,0.05)', 
    badge: 'Nouveau' 
  },
  { 
    icon: MapPin, 
    title: 'Voyage spatial', 
    desc: 'Trouve des profils autour de toi avec la géolocalisation.',
    color: '#60A5FA', 
    glow: 'rgba(96,165,250,0.05)' 
  },
  { 
    icon: Shield, 
    title: 'Confiance & Trust', 
    desc: 'Profils authentifiés par selfie et certifiés par l’IA.',
    color: '#A78BFA', 
    glow: 'rgba(167,139,250,0.05)' 
  },
  { 
    icon: Star, 
    title: 'Duels & Quiz', 
    desc: 'Découvre ta compatibilité via des mini-jeux amusants.',
    color: '#F472B6', 
    glow: 'rgba(244,114,182,0.05)' 
  },
]

export default function WelcomePage() {
  const router = useRouter()

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#070708] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-12">
      {/* Éléments de lueur d'arrière-plan */}
      <div className="pointer-events-none absolute top-0 left-1/4 w-96 h-96 rounded-full bg-[var(--primary)] blur-[120px] opacity-[0.08]" />
      <div className="pointer-events-none absolute bottom-10 right-1/4 w-[400px] h-[400px] rounded-full bg-[var(--accent-cool)] blur-[150px] opacity-[0.06]" />

      {/* Header avec Logo */}
      <header className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-between pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => router.push('/')}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center shadow-[var(--shadow-glow)] border border-white/10">
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
            Erosia
          </span>
        </motion.div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto">
        {/* Colonne gauche: Titre héro & Accroche */}
        <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-1.5 text-xs text-[var(--text-secondary)] shadow-sm backdrop-blur-md"
          >
            <Sparkles className="text-[var(--primary)]" size={14} />
            Une nouvelle ère de rencontres premium
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="text-[clamp(2.25rem,6vw,4rem)] font-bold text-white leading-[1.05] tracking-[-0.03em]"
          >
            Là où les cœurs<br />
            <span className="text-gradient-primary">se rencontrent.</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="w-20 h-[3px] bg-gradient-to-r from-[var(--primary)] to-transparent rounded-full origin-left hidden lg:block"
          />

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="text-[var(--text-secondary)] text-base sm:text-lg max-w-md leading-relaxed"
          >
            Rencontres immersives en 3D, auras de compatibilité, cadeaux virtuels et profils vérifiés. Explorez un univers conçu pour des connexions intenses et mémorables.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            className="w-full max-w-sm sm:max-w-md lg:max-w-none flex flex-col sm:flex-row gap-3 pt-4"
          >
            <Button
              variant="premium"
              size="pill-lg"
              className="flex-1 text-sm font-semibold tracking-wide"
              onClick={() => router.push('/register')}
            >
              Commencer l&rsquo;aventure
              <ArrowRight size={18} />
            </Button>
            <Button
              variant="secondary"
              size="pill-lg"
              className="flex-1 text-sm font-semibold tracking-wide border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white backdrop-blur-md"
              onClick={() => router.push('/login')}
            >
              Se connecter
            </Button>
          </motion.div>
        </div>

        {/* Colonne droite: Liste des fonctionnalités en grille Glassmorphism */}
        <div className="lg:col-span-7 w-full flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {features.map(({ icon: Icon, title, desc, color, badge }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 + i * 0.05 }}
                className="group relative overflow-hidden rounded-2xl p-5 border border-white/5 bg-[rgba(15,15,17,0.6)] backdrop-blur-md hover:border-white/10 hover:bg-[rgba(20,20,24,0.7)] transition-all duration-300 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]"
              >
                {/* Lueur d'effet de carte */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-2xl" 
                  style={{
                    background: `radial-gradient(circle at center, ${color}15 0%, transparent 70%)`
                  }}
                />

                <div className="flex gap-4 items-start relative z-10">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                    style={{ 
                      backgroundColor: `${color}0d`,
                      borderColor: `${color}20`
                    }}
                  >
                    <Icon size={18} style={{ color }} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white tracking-wide">{title}</h3>
                      {badge && (
                        <span 
                          className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider border"
                          style={{
                            backgroundColor: '#FBBF2415',
                            color: '#FBBF24',
                            borderColor: '#FBBF2430'
                          }}
                        >
                          {badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </main>

      {/* Footer / Copyright */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between pt-8 text-[11px] text-[var(--text-muted)] tracking-wider">
        <p>© {new Date().getFullYear()} Erosia. Tous droits réservés.</p>
        <div className="flex gap-4 mt-2 sm:mt-0">
          <a href="/privacy" className="hover:text-white transition-colors duration-200">Politique de confidentialité</a>
          <span>·</span>
          <a href="/cgu" className="hover:text-white transition-colors duration-200">CGU</a>
        </div>
      </footer>
    </div>
  )
}
