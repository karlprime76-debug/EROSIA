'use client'

export default function ChatError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="glass-card rounded-3xl p-8 max-w-sm w-full text-center">
        <h2 className="text-xl font-bold mb-1">Conversation indisponible</h2>
        <p className="text-[#9E9488] text-sm mb-6">Impossible de charger cette conversation.</p>
        <button type="button" onClick={reset}
          className="w-full py-3.5 rounded-full text-white font-semibold transition active:scale-95"
          style={{ background: '#D92D4A' }}>
          Réessayer
        </button>
      </div>
    </div>
  )
}
