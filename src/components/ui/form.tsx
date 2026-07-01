'use client'

import { type ComponentPropsWithoutRef, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends ComponentPropsWithoutRef<'input'> {
  label: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className={cn(
            'text-xs font-medium block tracking-wide',
            error ? 'text-[var(--error)]' : 'text-[var(--textSecondary)]'
          )}
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            'w-full bg-[var(--card)] text-[var(--textPrimary)] border rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200',
            error
              ? 'border-[var(--error)]/50 focus:border-[var(--error)] focus:shadow-[0_0_0_3px_var(--errorBg)]'
              : 'border-[var(--border)] focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_var(--primaryGlow)]',
            'placeholder:text-[var(--textMuted)]',
            className
          )}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-[11px] text-[var(--error)] mt-1.5 px-1">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export interface SelectProps extends ComponentPropsWithoutRef<'select'> {
  label: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="text-xs font-medium text-[var(--textSecondary)] block">
          {label}
        </label>
        <select
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            'w-full bg-[var(--card)] text-[var(--textPrimary)] border rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 appearance-none',
            error ? 'border-[var(--error)]/50' : 'border-[var(--border)] focus:border-[var(--primary)]',
            className
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p id={`${inputId}-error`} role="alert" className="text-[11px] text-[var(--error)] mt-1 px-1">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
