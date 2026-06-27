'use client'

import { type ComponentPropsWithoutRef, forwardRef, useState } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends ComponentPropsWithoutRef<'input'> {
  label: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false)
    const hasValue = props.value !== undefined && props.value !== ''
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
    const showLabel = focused || hasValue

    return (
      <div className="relative">
        <label
          htmlFor={inputId}
          className={cn(
            'absolute left-4 transition-all duration-200 pointer-events-none',
            showLabel
              ? '-top-2.5 text-[10px] font-medium px-1.5 rounded'
              : 'top-3 text-sm',
            error
              ? 'text-[#F87171]'
              : showLabel
                ? 'text-[#A09890] bg-[#18181A]'
                : 'text-[#6B6560]'
          )}
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          onFocus={(e) => { setFocused(true); onFocus?.(e) }}
          onBlur={(e) => { setFocused(false); onBlur?.(e) }}
          className={cn(
            'w-full bg-[#18181A] text-[#F5F0EB] border rounded-xl px-4 pt-3 pb-2.5 text-sm outline-none transition-all duration-200',
            error
              ? 'border-[#F87171]/50 focus:border-[#F87171] focus:shadow-[0_0_0_3px_rgba(248,113,113,0.12)]'
              : 'border-[#2C2A28] focus:border-[#D92D4A] focus:shadow-[0_0_0_3px_rgba(217,45,74,0.12)]',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-[11px] text-[#F87171] mt-1.5 px-1">{error}</p>
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
        <label htmlFor={inputId} className="text-xs font-medium text-[#A09890] block">
          {label}
        </label>
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'w-full bg-[#18181A] text-[#F5F0EB] border rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 appearance-none',
            error ? 'border-[#F87171]/50' : 'border-[#2C2A28] focus:border-[#D92D4A]',
            className
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p className="text-[11px] text-[#F87171] mt-1 px-1">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
