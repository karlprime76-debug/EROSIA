export const metadata = {
  title: 'Hors connexion | Erosia',
  description: 'Vous êtes hors connexion. Vérifiez votre connexion internet et réessayez.',
}

export default function OfflinePage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-theme text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 to-transparent mx-auto mb-6 flex items-center justify-center border border-[var(--primary)]/10">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-theme mb-2">Pas de connexion</h1>
      <p className="text-secondary text-sm max-w-xs leading-relaxed">
        Vérifie ta connexion internet et réessaie.
      </p>
    </div>
  )
}