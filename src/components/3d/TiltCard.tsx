'use client'

import { useRef, ReactNode, useState } from 'react'

export function TiltCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState({})

  const handleMove = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rotX = (y - 0.5) * -8
    const rotY = (x - 0.5) * 8
    setStyle({ transform: `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02,1.02,1.02)` })
  }

  const handleLeave = () => {
    setStyle({ transform: 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)', transition: 'transform 0.5s ease' })
  }

  return (
    <div ref={ref} onPointerMove={handleMove} onPointerLeave={handleLeave} style={style} className={className}>
      {children}
    </div>
  )
}
