'use client'

import { motion } from 'motion/react'
import { useScrollAnimation } from '@/hooks/use-scroll-animation'
import { fadeUp, fadeIn, scaleIn, springGentle } from '@/lib/design'
import { cn } from '@/lib/utils'

interface AnimatedPageProps {
  children: React.ReactNode
  className?: string
  variant?: 'fade-up' | 'fade-in' | 'scale-in'
}

const variants = {
  'fade-up': fadeUp,
  'fade-in': fadeIn,
  'scale-in': scaleIn,
}

export function AnimatedPage({ children, className, variant = 'fade-up' }: AnimatedPageProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants[variant]}
      transition={springGentle}
      className={cn('flex-1 flex flex-col', className)}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      variants={fadeUp}
      transition={springGentle}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={springGentle}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}
