'use client'

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fr">
      <body className="flex items-center justify-center min-h-screen bg-[#1a1a2e] text-white p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Une erreur est survenue</h1>
          <p className="text-gray-400 mb-6">
            L&apos;application a rencontré un problème inattendu. Nos équipes ont été notifiées.
          </p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-[#D92D4A] text-white rounded-2xl font-semibold hover:bg-[#c4283f] transition-colors"
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}