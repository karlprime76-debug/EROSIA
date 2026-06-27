import type { Variants } from 'motion/react'

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1 },
}

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
}

export const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

export const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  mass: 0.8,
}

export const smoothTransition = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 25,
}

export const cardHover = {
  scale: 1.015,
  boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
  transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
}

export const buttonTap = { scale: 0.96 }

export const buttonHover = {
  scale: 1.03,
  transition: { type: 'spring' as const, stiffness: 400, damping: 15 },
}

export const glass = 'bg-[rgba(20,20,22,0.75)] backdrop-blur-[16px] border border-[rgba(255,255,255,0.06)] shadow-[0_8px_32px_rgba(0,0,0,0.4)]'

export const glassCard = 'bg-[linear-gradient(135deg,rgba(28,28,30,0.9),rgba(20,20,22,0.95))] backdrop-blur-[20px] border border-[rgba(255,255,255,0.06)] shadow-[0_4px_24px_rgba(0,0,0,0.3),0_1px_2px_rgba(0,0,0,0.2)]'

export const sensualText = 'bg-[linear-gradient(90deg,#D92D4A,#C85A17,#D4782B,#D92D4A)] bg-[length:200%_auto] bg-clip-text text-transparent animate-[sensual-shimmer_4s_linear_infinite]'
