'use client'

import { forwardRef, type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva(
  'rounded-2xl transition-all duration-200',
  {
    variants: {
      variant: {
        default:
          'bg-[#1C1C1E] border border-[#2A2826]',
        glass:
          'bg-[rgba(20,20,22,0.75)] backdrop-blur-[16px] border border-[rgba(255,255,255,0.06)] shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
        elevated:
          'bg-[linear-gradient(135deg,rgba(28,28,30,0.9),rgba(20,20,22,0.95))] backdrop-blur-[20px] border border-[rgba(255,255,255,0.06)] shadow-[0_4px_24px_rgba(0,0,0,0.3),0_1px_2px_rgba(0,0,0,0.2)]',
        outline:
          'bg-transparent border border-[#2A2826]',
      },
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-5',
        lg: 'p-7',
      },
      hoverable: {
        true: 'cursor-pointer hover:scale-[1.015] hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]',
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
  extends Omit<HTMLAttributes<HTMLDivElement>, 'hoverable'>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, hoverable = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding, hoverable, className }))}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Card.displayName = 'Card'
