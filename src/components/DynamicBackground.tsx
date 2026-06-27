'use client'

import dynamic from 'next/dynamic'

const Background = dynamic(() => import('@/components/3d/SensualBackground').then(m => ({ default: m.SensualBackground })), {
  ssr: false,
  loading: () => <div className="fixed inset-0 pointer-events-none z-0" />,
})

export function DynamicBackground() {
  return <Background />
}
