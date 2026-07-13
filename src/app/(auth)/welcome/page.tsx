'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'motion/react'
import { Heart, MessageCircle, Gift, MapPin, Shield, Sparkles, Infinity, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  { 
    icon: Heart, 
    title: 'Matchs authentiques', 
    desc: 'Notre algorithme de compatibilité te connecte aux âmes qui résonnent vraiment avec toi.',
    color: 'var(--primary)', 
  },
  { 
    icon: MessageCircle, 
    title: 'Chat en temps réel', 
    desc: 'Messages, vocaux, réactions éphémères : laisse parler ton cœur sans filtre.',
    color: 'var(--success)', 
  },
  { 
    icon: Gift, 
    title: 'Boutique cadeaux', 
    desc: 'Surprends avec des cadeaux virtuels via Mobile Money ou carte bancaire.',
    color: 'var(--warning)', 
  },
  { 
    icon: MapPin, 
    title: 'À proximité', 
    desc: 'Explore des profils autour de toi grâce à la géolocalisation et trouve l\'amour près de chez toi.',
    color: 'var(--info)', 
  },
  { 
    icon: Shield, 
    title: 'Profils vérifiés', 
    desc: 'Chaque profil est authentifié par selfie et IA. Fini les faux comptes.',
    color: 'var(--accent-purple)', 
  },
  { 
    icon: Infinity, 
    title: 'Affinité & Auras', 
    desc: 'Ton aura de compatibilité évolue avec tes interactions. Les connexions les plus fortes émergent naturellement.',
    color: 'var(--accent-pink)', 
  },
]

export default function WelcomePage() {
  const router = useRouter()

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-theme flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-12">
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center shadow-glow border border-light">
              <Sparkles size={16} className="text-theme" />
          </div>
          <span className="text-xl font-bold text-theme tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
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
            className="inline-flex items-center gap-2 rounded-full border border-light bg-surface px-4 py-1.5 text-xs text-secondary shadow-sm backdrop-blur-md"
          >
            <Sparkles className="text-primary" size={14} />
            Là où les cœurs authentiques se rencontrent
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="text-[clamp(2.25rem,6vw,4rem)] font-bold text-theme leading-[1.05] tracking-[-0.03em]"
          >
            L&rsquo;amour véritable<br />
            <span className="text-gradient-primary">commence ici.</span>
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
            className="text-secondary text-base sm:text-lg max-w-md leading-relaxed"
          >
            Erosia est bien plus qu&rsquo;une app de rencontres : c&rsquo;est un univers où les connexions authentiques prennent vie. Profils vérifiés, affinités invisibles, cadeaux du cœur — chaque détail est pensé pour t&rsquo;aider à trouver l&rsquo;amour que tu mérites.
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
              className="flex-1 text-sm font-semibold tracking-wide border border-light hover:border-theme bg-surface hover:bg-hover text-theme backdrop-blur-md"
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
            {features.map(({ icon: Icon, title, desc, color }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 + i * 0.05 }}
                className="group relative overflow-hidden rounded-2xl p-5 border border-light bg-surface backdrop-blur-md hover:border-theme hover:bg-hover transition-all duration-300 shadow-card hover:shadow-elevated"
              >
                {/* Lueur d'effet de carte */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-2xl" 
                  style={{
                    background: `radial-gradient(circle at center, color-mix(in srgb, ${color} 8%, transparent) 0%, transparent 70%)`
                  }}
                />

                <div className="flex gap-4 items-start relative z-10">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                    style={{ 
                      backgroundColor: `color-mix(in srgb, ${color} 5%, transparent)`,
                      borderColor: `color-mix(in srgb, ${color} 13%, transparent)`
                    }}
                  >
                    <Icon size={18} style={{ color }} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-sm font-semibold text-theme tracking-wide">{title}</h3>
                    <p className="text-xs text-secondary leading-relaxed">{desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </main>

      {/* Footer / Copyright */}
       <footer className="relative z-10 w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between pt-8 text-[11px] text-muted tracking-wider">
        <p>© {new Date().getFullYear()} Erosia. Tous droits réservés.</p>
        <div className="flex gap-4 mt-2 sm:mt-0">
          <Link href="/privacy" className="hover:text-theme transition-colors duration-200">Politique de confidentialité</Link>
          <span>·</span>
          <Link href="/cgu" className="hover:text-theme transition-colors duration-200">CGU</Link>
        </div>
      </footer>
    </div>
  )
}
