'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { supabase } from '@/lib/supabase/client'

export default function SplashPage() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [userSession, setUserSession] = useState<boolean>(false)
  const [animationStep, setAnimationStep] = useState(0) // 0: Enter, 1: Loop, 2: Exit

  useEffect(() => {
    // 1. Démarrer l'animation
    const animTimer = setTimeout(() => {
      setAnimationStep(1)
    }, 800)

    // 2. Vérifier la session
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUserSession(!!user)
      } catch (err) {
        console.error('Splash auth check failed:', err)
        setUserSession(false)
      } finally {
        // Laisser l'animation jouer au moins 2.2 secondes pour un effet premium
        setTimeout(() => {
          setIsChecking(false)
          setAnimationStep(2)
        }, 2200)
      }
    }

    checkAuth()

    return () => clearTimeout(animTimer)
  }, [])

  // Gérer la redirection après la fin de l'animation de sortie
  const handleAnimationComplete = () => {
    if (animationStep === 2) {
      if (userSession) {
        router.replace('/discover')
      } else {
        router.replace('/welcome')
      }
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#070708] flex flex-col items-center justify-center select-none">
      {/* Arrière-plans lumineux cinématiques */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(217,45,74,0.14)_0%,_transparent_65%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(124,138,232,0.08)_0%,_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(232,168,124,0.06)_0%,_transparent_50%)]" />

      {/* Superposition de bruit texture */}
      <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')]" />

      <AnimatePresence onExitComplete={handleAnimationComplete}>
        {animationStep < 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center justify-center"
          >
            {/* Conteneur du Logo & Lueur */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              {/* Halos de lumière pulsants */}
              <motion.div
                animate={{
                  scale: [1, 1.25, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute w-32 h-32 rounded-full bg-[var(--primary)] blur-3xl opacity-60"
              />
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
                className="absolute w-44 h-44 rounded-full bg-[var(--accent-warm)] blur-3xl opacity-40"
              />

              {/* Anneaux d'onde d'Aura */}
              <motion.div
                animate={{
                  scale: [0.8, 2.2],
                  opacity: [0.8, 0],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="absolute w-20 h-20 rounded-full border border-[rgba(217,45,74,0.3)] shadow-[0_0_15px_rgba(217,45,74,0.15)]"
              />
              <motion.div
                animate={{
                  scale: [0.8, 2.2],
                  opacity: [0.6, 0],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 1.1,
                }}
                className="absolute w-20 h-20 rounded-full border border-[rgba(124,138,232,0.2)] shadow-[0_0_15px_rgba(124,138,232,0.1)]"
              />

              {/* Particules flottantes simulées */}
              {[...Array(6)].map((_, i) => {
                const angles = [0, 60, 120, 180, 240, 300]
                const radius = 55 + (i % 2) * 15
                return (
                  <motion.div
                    key={i}
                    animate={{
                      y: [0, -15 - (i % 3) * 5, 0],
                      x: [0, (i % 2 === 0 ? 10 : -10), 0],
                      opacity: [0.2, 0.7, 0.2],
                      scale: [1, 1.25, 1],
                    }}
                    transition={{
                      duration: 3 + (i % 3),
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.4,
                    }}
                    className="absolute w-1.5 h-1.5 rounded-full"
                    style={{
                      left: `calc(50% + ${Math.cos((angles[i] * Math.PI) / 180) * radius}px - 3px)`,
                      top: `calc(50% + ${Math.sin((angles[i] * Math.PI) / 180) * radius}px - 3px)`,
                      background: i % 2 === 0 ? 'var(--primary)' : 'var(--accent-warm)',
                      boxShadow: i % 2 === 0 ? '0 0 8px var(--primary)' : '0 0 8px var(--accent-warm)',
                    }}
                  />
                )
              })}

              {/* Logo Cœur Premium */}
              <motion.div
                animate={{
                  scale: [1, 1.08, 1],
                }}
                transition={{
                  duration: 1.1,
                  repeat: Infinity,
                  ease: [0.25, 0.8, 0.25, 1],
                }}
                className="relative z-10 w-20 h-20 bg-gradient-to-tr from-[var(--primary)] via-[var(--primary-light)] to-[var(--accent-warm)] rounded-[2rem] flex items-center justify-center shadow-[0_12px_36px_rgba(217,45,74,0.35),_inset_0_2px_4px_rgba(255,255,255,0.25)] border border-[rgba(255,255,255,0.15)]"
              >
                <svg
                  className="w-10 h-10 text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)]"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </motion.div>
            </div>

            {/* Texte et sous-titres */}
            <div className="mt-8 text-center space-y-3">
              <motion.h1
                initial={{ letterSpacing: '0.1em', opacity: 0 }}
                animate={{ letterSpacing: '0.25em', opacity: 1 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-3xl font-bold tracking-[0.25em] text-white uppercase"
                style={{ fontFamily: 'var(--font-playfair)' }}
              >
                Erosia
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 0.5, y: 0 }}
                transition={{ duration: 1, delay: 0.4 }}
                className="text-xs uppercase tracking-[0.4em] text-[var(--text-secondary)] font-medium"
              >
                Rencontre · Immersion · Passion
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Petit indicateur de chargement premium en bas */}
      <div className="absolute bottom-16 left-0 right-0 flex justify-center">
        <div className="relative w-12 h-[2px] bg-[#111214] rounded-full overflow-hidden">
          <motion.div
            animate={{
              x: [-48, 48],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-0 left-0 w-12 h-full bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent"
          />
        </div>
      </div>
    </div>
  )
}
