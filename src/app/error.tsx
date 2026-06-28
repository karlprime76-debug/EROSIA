'use client'

export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-transparent">
      <div className="glass-card rounded-3xl p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D92D4A]/20 to-transparent mx-auto mb-4 flex items-center justify-center">
          <span className="text-3xl">💔</span>
        </div>
        <h2 className="text-xl font-bold mb-1">Oups !</h2>
        <p className="text-[#9E9488] text-sm mb-6">Une erreur est survenue.</p>
        <button type="button" onClick={reset}
          className="w-full py-3.5 rounded-full text-white font-semibold transition active:scale-95"
          style={{ background: '#D92D4A' }}>
          Réessayer
        </button>
      </div>
    </div>
  )
}
