'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion, type HTMLMotionProps } from 'motion/react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-300 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D4A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070708] disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        primary:
          'bg-[#D92D4A] text-white rounded-full shadow-[0_4px_16px_rgba(217,45,74,0.25)] hover:bg-[#FF3B5C] hover:shadow-[0_6px_28px_rgba(217,45,74,0.4)] active:shadow-[0_2px_8px_rgba(217,45,74,0.15)]',
        secondary:
          'bg-[#18181A] text-[#F5F0EB] rounded-full border border-[#2C2A28] hover:bg-[#222225] hover:border-[#D92D4A]/30',
        ghost:
          'text-[#A09890] hover:text-[#F5F0EB] hover:bg-[#222225] rounded-lg',
        outline:
          'rounded-full border border-[#2C2A28] text-[#F5F0EB] bg-transparent hover:bg-[#222225] hover:border-[#D92D4A]',
        gradient:
          'rounded-full bg-[linear-gradient(135deg,#D92D4A,#E8A87C)] text-white shadow-[0_4px_20px_rgba(217,45,74,0.25)] hover:shadow-[0_6px_32px_rgba(217,45,74,0.4)]',
        sensual:
          'rounded-full bg-[linear-gradient(135deg,rgba(217,45,74,0.1),rgba(232,168,124,0.06))] text-[#D92D4A] border border-[rgba(217,45,74,0.15)] hover:bg-[linear-gradient(135deg,rgba(217,45,74,0.18),rgba(232,168,124,0.1))] hover:border-[rgba(217,45,74,0.25)] backdrop-blur-[12px]',
      },
      size: {
        sm: 'h-9 px-4 text-xs',
        md: 'h-11 px-6',
        lg: 'h-13 px-9 text-base',
        xl: 'h-14 px-10 text-base',
        icon: 'h-12 w-12 p-2.5',
        'icon-sm': 'h-9 w-9 p-2',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.02, transition: { type: 'spring', stiffness: 400, damping: 15 } }}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        ref={ref}
        {...(props as unknown as HTMLMotionProps<'button'>)}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </motion.button>
    )
  }
)
Button.displayName = 'Button'
