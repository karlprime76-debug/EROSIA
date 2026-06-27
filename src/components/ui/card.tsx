'use client'

import { forwardRef, type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva([
  'rounded-2xl transition-all duration-300',
], {
  variants: {
    variant: {
      default: 'bg-[var(--bg-card)] border border-[var(--border)]',
      glass: 'glass',
      'glass-strong': 'glass-strong',
      'glass-premium': 'glass-premium',
      elevated: 'card-elevated',
      premium: 'card-premium',
      outline: 'border border-[var(--border)] bg-transparent',
      crimson: 'glass-crimson',
      warm: 'glass-warm',
      cool: 'glass-cool',
      success: 'glass-success',
      deep: 'glass-deep',
    },
    padding: {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-5',
      xl: 'p-6',
      '2xl': 'p-8',
    },
    hoverable: {
      true: 'cursor-pointer hover:scale-[1.008] hover:shadow-lg',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
    hoverable: false,
  },
})

interface CardProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  as?: 'div' | 'motion.div'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, hoverable, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding, hoverable }), className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export { Card, cardVariants }
export type { CardProps }
