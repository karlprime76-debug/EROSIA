import type { Variants } from 'motion/react'

/* ── Page transitions v2 ── */

export const pageEnter: Variants = {
  initial: { opacity: 0, y: 16, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -12, filter: 'blur(2px)' },
}

export const pageTransition = {
  type: 'spring' as const,
  stiffness: 280,
  damping: 30,
  mass: 0.7,
}

/* ── Fade variants ── */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export const fadeUpSm: Variants = {
  hidden: { opacity: 0, y: 8 },
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

export const slideDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
}

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0 },
}

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0 },
}

export const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.06 },
  },
}

export const staggerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.025, delayChildren: 0.04 },
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

export const springStiff = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 35,
  mass: 0.4,
}

export const springLazy = {
  type: 'spring' as const,
  stiffness: 180,
  damping: 30,
  mass: 1.2,
}

/* ── Interaction presets ── */

export const cardHover = {
  scale: 1.008,
  boxShadow: 'var(--shadow-lg)',
  transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
}

export const cardTap = { scale: 0.985 }

export const buttonTap = { scale: 0.96 }

export const buttonHover = {
  scale: 1.015,
  transition: { type: 'spring' as const, stiffness: 400, damping: 15 },
}

export const iconHover = {
  scale: 1.1,
  transition: { type: 'spring' as const, stiffness: 400, damping: 15 },
}

export const avatarHover = {
  scale: 1.05,
  boxShadow: '0 0 24px rgba(217,45,74,0.3)',
  transition: { type: 'spring' as const, stiffness: 400, damping: 20 },
}

/* ── List animations ── */

export const listItem = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0 },
}

/* ── Swipe card ── */

export const swipeCardExit = (x: number) => ({
  opacity: 0,
  x: x > 0 ? 400 : -400,
  rotate: x > 0 ? 12 : -12,
  transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
})

export const swipeCardDrag = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8,
}

/* ── Modal ── */

export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 24 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.92, y: 24 },
}

export const modalContentSlideUp: Variants = {
  hidden: { opacity: 0, y: '100%' },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: '100%' },
}

/* ── Bottom sheet ── */

export const bottomSheetOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

export const bottomSheetContent: Variants = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: { type: 'spring', stiffness: 400, damping: 35, mass: 0.9 } },
  exit: { y: '100%', transition: { type: 'spring', stiffness: 400, damping: 35 } },
}

/* ── Notification / badge ── */

export const badgePop: Variants = {
  hidden: { scale: 0 },
  visible: { scale: 1, transition: { type: 'spring', stiffness: 500, damping: 15 } },
}

/* ── Heart / Like ── */

export const heartBeat: Variants = {
  hidden: { scale: 0, rotate: -15 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 400, damping: 12 },
  },
}
