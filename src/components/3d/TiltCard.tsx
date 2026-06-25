'use client'

import { useRef, ReactNode } from 'react'

export function TiltCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rotX = (y - 0.5) * -8
    const rotY = (x - 0.5) * 8
    el.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02,1.02,1.02)`
  }

  const handleLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)'
    el.style.transition = 'transform 0.5s ease'
    setTimeout(() => { el.style.transition = '' }, 500)
  }

  return (
    <div ref={ref} onPointerMove={handleMove} onPointerLeave={handleLeave} className={className}>
      {children}
    </div>
  )
}
