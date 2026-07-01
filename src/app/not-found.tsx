import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center min-h-screen">
      <div className="relative mb-8">
        <div className="text-[120px] font-bold leading-none text-transparent bg-clip-text bg-gradient-to-b from-[var(--primary)] to-[var(--accentOrange)] opacity-30 select-none">404</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full border border-[var(--primary)]/20 flex items-center justify-center">
            <span className="text-4xl">💔</span>
          </div>
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-2">Page introuvable</h2>
      <p className="text-secondary text-sm max-w-xs mb-8 leading-relaxed">
        Cette page s&rsquo;est envolée comme un amour de saison.
      </p>
      <Link href="/discover"
        className="px-8 py-3 rounded-full text-on-primary font-semibold text-sm transition-all hover:shadow-[0_0_20px_var(--primaryGlow)] active:scale-95"
        style={{ background: 'var(--primary)' }}>
        Retourner sur Erosia
      </Link>
    </div>
  )
}
