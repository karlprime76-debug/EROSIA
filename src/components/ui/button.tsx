'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion, type HTMLMotionProps } from 'motion/react'
import { cn } from '@/lib/utils'
import { buttonTap, buttonHover } from '@/lib/design'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D4A] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-[#D92D4A] text-white shadow-[0_2px_12px_rgba(217,45,74,0.3)] hover:bg-[#FF2D55] hover:shadow-[0_4px_20px_rgba(217,45,74,0.5)] active:shadow-[0_1px_4px_rgba(217,45,74,0.2)]',
        secondary:
          'bg-[#1C1C1E] text-[#F5F0EB] border border-[#2A2826] hover:bg-[#262628] hover:border-[#3A3836]',
        ghost:
          'text-[#9E9488] hover:text-[#F5F0EB] hover:bg-[#262628]',
        outline:
          'border border-[#2A2826] text-[#F5F0EB] bg-transparent hover:bg-[#262628] hover:border-[#D92D4A]',
        gradient:
          'bg-[linear-gradient(135deg,#D92D4A,#C85A17)] text-white shadow-[0_2px_16px_rgba(217,45,74,0.3)] hover:shadow-[0_4px_24px_rgba(217,45,74,0.5)]',
        sensual:
          'bg-[linear-gradient(135deg,rgba(217,45,74,0.15),rgba(200,90,23,0.1))] text-[#D92D4A] border border-[rgba(217,45,74,0.2)] hover:bg-[linear-gradient(135deg,rgba(217,45,74,0.25),rgba(200,90,23,0.15))] hover:border-[rgba(217,45,74,0.3)] backdrop-blur-[8px]',
      },
      size: {
        sm: 'h-9 px-3 text-xs rounded-lg',
        md: 'h-11 px-5',
        lg: 'h-13 px-8 text-base rounded-xl',
        icon: 'h-12 w-12 rounded-xl p-2.5',
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
        whileTap={buttonTap}
        whileHover={buttonHover}
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
