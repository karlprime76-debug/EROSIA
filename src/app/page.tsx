import { SplashClient } from './splash-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Erosia',
  description: 'Rencontre · Immersion · Passion',
  other: {
    'theme-color': '#070708',
  },
}

export default function SplashPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#070708] flex flex-col items-center justify-center select-none">
      {/* Preload hint for font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(217,45,74,0.14)_0%,_transparent_65%)]" />

      {/* Desktop-only gradients — class hidden on mobile */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(124,138,232,0.08)_0%,_transparent_55%)] hidden sm:block" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(232,168,124,0.06)_0%,_transparent_50%)] hidden sm:block" />

      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className="relative w-40 h-40 flex items-center justify-center">
          {/* Glow pulse — CSS keyframe instead of JS animation */}
          <div className="splash-glow absolute w-32 h-32 rounded-full bg-[var(--primary)] blur-3xl opacity-60" />

          {/* Desktop-only second glow */}
          <div className="splash-glow-2 hidden sm:block absolute w-44 h-44 rounded-full bg-[var(--accent-warm)] blur-3xl opacity-40" />

          {/* Expanding ring */}
          <div className="splash-ring absolute w-20 h-20 rounded-full border border-[rgba(217,45,74,0.3)]" />

          {/* Desktop-only second ring */}
          <div className="splash-ring-2 hidden sm:block absolute w-20 h-20 rounded-full border border-[rgba(124,138,232,0.2)]" />

          {/* Floating particles — 3 mobile, 6 desktop via CSS counters */}
          <div className="splash-particle splash-p1" />
          <div className="splash-particle splash-p2" />
          <div className="splash-particle splash-p3" />
          <div className="splash-particle splash-p4 hidden sm:block" />
          <div className="splash-particle splash-p5 hidden sm:block" />
          <div className="splash-particle splash-p6 hidden sm:block" />

          {/* Logo icon */}
          <div className="splash-logo relative z-10 w-20 h-20 bg-gradient-to-tr from-[var(--primary)] via-[var(--primary-light)] to-[var(--accent-warm)] rounded-[2rem] flex items-center justify-center shadow-[0_12px_36px_rgba(217,45,74,0.35),_inset_0_2px_4px_rgba(255,255,255,0.25)] border border-[rgba(255,255,255,0.15)]">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        </div>

        <div className="mt-8 text-center space-y-3">
          <h1
            className="text-3xl font-bold tracking-[0.25em] text-white uppercase splash-title"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            Erosia
          </h1>
          <p className="splash-subtitle text-xs uppercase tracking-[0.4em] text-[var(--text-secondary)] font-medium">
            Rencontre · Immersion · Passion
          </p>
        </div>
      </div>

      {/* Desktop-only shimmer bar */}
      <div className="splash-shimmer absolute bottom-16 left-0 right-0 flex justify-center hidden sm:flex">
        <div className="relative w-12 h-[2px] bg-[#111214] rounded-full overflow-hidden">
          <div className="absolute top-0 left-0 w-12 h-full bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent splash-slide" />
        </div>
      </div>

      <SplashClient />
    </div>
  )
}
