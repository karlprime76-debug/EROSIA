'use client'

import { type HTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion, type HTMLMotionProps } from 'motion/react'
import { cn } from '@/lib/utils'

const cardVariants = cva(
  'rounded-2xl transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'bg-[#18181A] border border-[#2C2A28]',
        glass: 'glass',
        elevated: 'card-elevated',
        outline: 'bg-transparent border border-[#2C2A28]',
        crimson: 'glass-crimson',
        warm: 'glass-warm',
      },
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-5',
        lg: 'p-7',
      },
      hoverable: {
        true: 'cursor-pointer',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      hoverable: false,
    },
  }
)

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  as?: 'div' | 'motion.div'
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, hoverable, as = 'div', children, ...props }, ref) => {
    if (as === 'motion.div') {
      const MotionDiv = motion.div
      return (
        <MotionDiv
          whileHover={hoverable ? { scale: 1.012, y: -2, transition: { type: 'spring', stiffness: 400, damping: 25 } } : undefined}
          whileTap={hoverable ? { scale: 0.99 } : undefined}
          className={cn(cardVariants({ variant, padding, hoverable, className }))}
          ref={ref}
          {...(props as unknown as HTMLMotionProps<'div'>)}
        >
          {children}
        </MotionDiv>
      )
    }
    return (
      <div
        className={cn(cardVariants({ variant, padding, hoverable, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Card.displayName = 'Card'
