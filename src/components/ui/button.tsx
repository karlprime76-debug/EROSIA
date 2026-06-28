'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva([
  'inline-flex items-center justify-center font-medium select-none',
  'transition-all duration-200 ease-out',
  'active:scale-[0.97]',
  'focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2',
  'disabled:pointer-events-none disabled:opacity-50',
], {
  variants: {
    variant: {
      primary: [
        'bg-[var(--primary)] text-white',
        'hover:bg-[var(--primary-light)]',
        'shadow-[0_4px_16px_rgba(217,45,74,0.25)]',
        'hover:shadow-[0_8px_32px_rgba(217,45,74,0.35)]',
        'hover:scale-[1.015]',
      ],
      secondary: [
        'bg-[var(--bg-card)] text-[var(--text)]',
        'border border-[var(--border)]',
        'hover:bg-[var(--bg-hover)] hover:border-[var(--text-muted)]',
      ],
      ghost: [
        'text-[var(--text-secondary)]',
        'hover:text-[var(--text)] hover:bg-[var(--bg-hover)]',
      ],
      outline: [
        'border border-[var(--border)] text-[var(--text)]',
        'hover:border-[var(--primary)] hover:text-[var(--primary)]',
        'bg-transparent',
      ],
      danger: [
        'bg-[var(--error)] text-white',
        'hover:opacity-90',
        'shadow-[0_4px_16px_rgba(248,113,113,0.2)]',
      ],
      premium: [
        'relative overflow-hidden',
        'bg-gradient-to-b from-[var(--primary-light)] to-[var(--primary)]',
        'text-white font-semibold',
        'shadow-[0_4px_24px_rgba(217,45,74,0.3)]',
        'hover:shadow-[0_8px_40px_rgba(217,45,74,0.4)]',
        'hover:scale-[1.015]',
        'before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/10 before:to-transparent before:opacity-0',
        'hover:before:opacity-100 before:transition-opacity before:duration-200',
      ],
      glowing: [
        'bg-[var(--primary)] text-white',
        'shadow-[0_0_20px_rgba(217,45,74,0.3)]',
        'hover:shadow-[0_0_40px_rgba(217,45,74,0.5)]',
        'animate-glow-ring',
      ],
      glass: [
        'glass text-[var(--text)]',
        'hover:bg-[var(--bg-hover)]',
      ],
    },
    size: {
      xs: 'h-8 px-2.5 text-xs rounded-lg gap-1.5',
      sm: 'h-9 px-3.5 text-sm rounded-xl gap-1.5',
      md: 'h-11 px-5 text-sm rounded-xl gap-2',
      lg: 'h-12 px-6 text-base rounded-2xl gap-2',
      xl: 'h-14 px-8 text-lg rounded-2xl gap-2.5',
      icon: 'h-11 w-11 rounded-xl',
      'icon-sm': 'h-9 w-9 rounded-lg',
      pill: 'h-11 px-6 text-sm rounded-full gap-2',
      'pill-lg': 'h-14 px-8 text-base rounded-full gap-2.5',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
})

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
export type { ButtonProps }
