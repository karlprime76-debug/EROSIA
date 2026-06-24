'use client'

import Link from 'next/link'
import Image from 'next/image'
import { FloatingHearts } from '@/components/3d/FloatingHearts'

export default function WelcomePage() {
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #D92D4A, #8B0000)' }}>
      <FloatingHearts />
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-16">
        <div className="text-center mb-16 flex flex-col items-center">
          <Image src="/logo.png" alt="Erosia" width={180} height={60} className="mb-3" priority />
          <p className="text-lg text-white/90">Là où les cœurs se rencontrent</p>
        </div>

        <div className="flex flex-col gap-4 mb-16 text-white">
          {[{ emoji: '🔥', text: 'Rencontres authentiques' },
            { emoji: '💬', text: 'Conversations réelles' },
            { emoji: '✨', text: 'Matchs intelligents' },
          ].map(({ emoji, text }) => (
            <div key={text} className="flex items-center gap-3">
              <span className="text-2xl">{emoji}</span>
              <span className="text-base">{text}</span>
            </div>
          ))}
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3">
          <Link
            href="/onboarding"
            className="w-full py-3.5 rounded-full bg-white text-center font-semibold text-base"
            style={{ color: '#D92D4A' }}
          >
            Commencer
          </Link>
          <Link
            href="/login"
            className="w-full py-3.5 rounded-full border border-white text-center font-semibold text-base text-white"
          >
            J&rsquo;ai déjà un compte
          </Link>
        </div>
      </div>
    </div>
  )
}
