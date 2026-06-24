'use client'

import { SensualBackground } from './SensualBackground'

export default function BackgroundWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SensualBackground />
      <div className="sensual-overlay" />
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </>
  )
}
