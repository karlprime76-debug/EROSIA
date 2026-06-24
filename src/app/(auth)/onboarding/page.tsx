'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const slides = [
  { emoji: '💝', title: 'Trouvez l\'amour', desc: 'Notre algorithme intelligent vous connecte avec des personnes partageant vos affinités.' },
  { emoji: '🛡️', title: 'Rencontres sécurisées', desc: 'Votre sécurité est notre priorité. Profils vérifiés et modération active.' },
  { emoji: '🗣️', title: 'Véritables connexions', desc: 'Au-delà du physique, découvrez les personnalités qui vous correspondent.' },
]

export default function OnboardingPage() {
  const [slide, setSlide] = useState(0)
  const router = useRouter()

  const next = () => {
    if (slide < slides.length - 1) setSlide(slide + 1)
    else router.push('/register')
  }

  const s = slides[slide]

  return (
    <div className="flex-1 flex flex-col bg-white px-8">
      <div className="flex-1 flex flex-col items-center justify-center">
        <span className="text-7xl mb-8">{s.emoji}</span>
        <h2 className="text-2xl font-bold text-center mb-3">{s.title}</h2>
        <p className="text-base text-center text-zinc-500 leading-relaxed max-w-sm">{s.desc}</p>
      </div>
      <div className="pb-16 flex flex-col items-center gap-6">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${i === slide ? 'w-6 bg-rose-500' : 'bg-zinc-200'}`} />
          ))}
        </div>
        <button onClick={next} className="w-full max-w-sm py-3.5 rounded-full text-white font-semibold" style={{ background: '#FF3B5C' }}>
          {slide === slides.length - 1 ? 'Créer mon compte' : 'Suivant'}
        </button>
        {slide < slides.length - 1 && (
          <button onClick={() => router.push('/register')} className="text-zinc-500 text-sm">Passer</button>
        )}
      </div>
    </div>
  )
}
