'use client'

import Link from 'next/link'
import Image from 'next/image'
import { FloatingHearts } from '@/components/3d/FloatingHearts'

export default function WelcomePage() {
  return (
    <div className="min-h-dvh flex flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #D92D4A, #8B0000)' }}>
      <FloatingHearts />

      {/* Mobile layout */}
      <div className="flex flex-col min-h-dvh px-6 sm:px-12 lg:px-16 xl:px-24
        lg:flex-row lg:items-center lg:justify-between lg:max-w-7xl lg:mx-auto lg:w-full">

        {/* Brand + tagline */}
        <div className="flex flex-col items-center pt-16 pb-8 lg:pt-0 lg:items-start lg:flex-1 lg:pb-0">
          <Image src="/logo.png" alt="Erosia" width={200} height={66} className="mb-4 sm:w-56 lg:w-64" priority />
          <p className="text-white/90 text-base sm:text-lg lg:text-xl text-center lg:text-left max-w-md">
            Là où les cœurs se rencontrent
          </p>
        </div>

        {/* Features + CTA */}
        <div className="flex flex-col items-center gap-8 pb-16 lg:flex-1 lg:items-start lg:gap-10">
          <div className="flex flex-col gap-4 sm:gap-5 text-white">
            {[
              { emoji: '🔥', text: 'Rencontres authentiques' },
              { emoji: '💬', text: 'Conversations réelles' },
              { emoji: '✨', text: 'Matchs intelligents' },
            ].map(({ emoji, text }) => (
              <div key={text} className="flex items-center gap-3 sm:gap-4">
                <span className="text-2xl sm:text-3xl lg:text-4xl">{emoji}</span>
                <span className="text-base sm:text-lg lg:text-xl">{text}</span>
              </div>
            ))}
          </div>

          <div className="w-full max-w-sm flex flex-col gap-3 lg:max-w-md">
            <Link
              href="/onboarding"
              className="w-full py-3.5 sm:py-4 rounded-full bg-white text-center font-semibold text-base sm:text-lg transition-transform active:scale-95 hover:shadow-xl"
              style={{ color: '#D92D4A' }}
            >
              Commencer
            </Link>
            <Link
              href="/login"
              className="w-full py-3.5 sm:py-4 rounded-full border-2 border-white/80 text-center font-semibold text-base sm:text-lg text-white/90 transition-transform active:scale-95 hover:bg-white/10"
            >
              J&rsquo;ai déjà un compte
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
