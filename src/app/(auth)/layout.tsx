'use client'

import { FloatingHearts } from '@/components/3d/FloatingHearts'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh flex flex-col bg-[var(--bg)]">
      <FloatingHearts />
      <div className="relative z-10 flex flex-1 flex-col">
        {children}
      </div>
    </div>
  )
}
