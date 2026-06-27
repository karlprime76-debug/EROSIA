import type { Variants } from 'motion/react'

/* ── Page transitions ── */

export const pageEnter: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export const pageTransition = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 28,
  mass: 0.6,
}

/* ── Fade variants ── */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1 },
}

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
}

export const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.08 },
  },
}

/* ── Spring presets ── */

export const springGentle = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 28,
  mass: 0.8,
}

export const springSnappy = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 22,
  mass: 0.5,
}

export const springBouncy = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 18,
  mass: 0.7,
}

/* ── Interaction presets ── */

export const cardHover = {
  scale: 1.012,
  boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
  transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
}

export const cardTap = { scale: 0.98 }

export const buttonTap = { scale: 0.95 }

export const buttonHover = {
  scale: 1.02,
  transition: { type: 'spring' as const, stiffness: 400, damping: 15 },
}

export const iconHover = {
  scale: 1.1,
  transition: { type: 'spring' as const, stiffness: 400, damping: 15 },
}

export const avatarHover = {
  scale: 1.05,
  boxShadow: '0 0 20px rgba(217,45,74,0.3)',
  transition: { type: 'spring' as const, stiffness: 400, damping: 20 },
}

/* ── List animations ── */

export const listItem = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0 },
}

/* ── Modal ── */

export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.92, y: 20 },
}
