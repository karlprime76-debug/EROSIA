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
        <label htmlFor={inputId} className="text-xs font-medium text-[#9E9488] block">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full bg-[#1C1C1E] text-[#F5F0EB] border rounded-xl px-4 py-3 text-sm outline-none transition-all',
            error
              ? 'border-red-500/50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
              : 'border-[#2A2826] focus:border-[#D92D4A] focus:shadow-[0_0_0_3px_rgba(217,45,74,0.15)]',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-400 mt-1">{error}</p>
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
        <label htmlFor={inputId} className="text-xs font-medium text-[#9E9488] block">
          {label}
        </label>
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'w-full bg-[#1C1C1E] text-[#F5F0EB] border rounded-xl px-4 py-3 text-sm outline-none transition-all',
            error ? 'border-red-500/50' : 'border-[#2A2826] focus:border-[#D92D4A]',
            className
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
