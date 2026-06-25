import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center min-h-screen">
      <div className="relative mb-8">
        <div className="text-[120px] font-bold leading-none text-transparent bg-clip-text bg-gradient-to-b from-[#D92D4A] to-[#C85A17] opacity-30 select-none">404</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full border border-[#D92D4A]/20 flex items-center justify-center">
            <span className="text-4xl">💔</span>
          </div>
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-2">Page introuvable</h2>
      <p className="text-[#9E9488] text-sm max-w-xs mb-8 leading-relaxed">
        Cette page s&rsquo;est envolée comme un amour de saison.
      </p>
      <Link href="/discover"
        className="px-8 py-3 rounded-full text-white font-semibold text-sm transition-all hover:shadow-[0_0_20px_rgba(217,45,74,0.3)] active:scale-95"
        style={{ background: '#D92D4A' }}>
        Retourner sur Erosia
      </Link>
    </div>
  )
}
