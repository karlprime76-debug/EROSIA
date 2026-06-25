'use client'

export default function AuthError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] px-6">
      <div className="glass-card rounded-3xl p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D92D4A]/20 to-transparent mx-auto mb-4 flex items-center justify-center">
          <span className="text-3xl">🔐</span>
        </div>
        <h2 className="text-xl font-bold mb-1">Erreur de connexion</h2>
        <p className="text-[#9E9488] text-sm mb-6">Une erreur est survenue. Réessaie.</p>
        <button onClick={reset}
          className="w-full py-3.5 rounded-full text-white font-semibold transition active:scale-95"
          style={{ background: '#D92D4A' }}>
          Réessayer
        </button>
      </div>
    </div>
  )
}
