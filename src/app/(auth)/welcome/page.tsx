'use client'

import Link from 'next/link'

export default function WelcomePage() {
  return (
    <div className="flex-1 flex flex-col" style={{ background: 'linear-gradient(135deg, #FF3B5C, #6C63FF)' }}>
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-extrabold text-white tracking-wider mb-3">Erosia</h1>
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
            style={{ color: '#FF3B5C' }}
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
