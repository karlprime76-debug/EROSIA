import Link from 'next/link'

export const metadata = {
  title: "Conditions générales d'utilisation | Erosia",
  description: "Conditions générales d'utilisation de l'application de rencontres Erosia — acceptation, âge, comportement, données personnelles, abonnement Premium.",
}

export default function CguPage() {
  return (
    <div className="min-h-screen bg-theme text-theme p-6">
      <Link href="/settings" className="inline-flex items-center gap-2 text-secondary hover:text-theme transition mb-6 text-sm">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Retour
      </Link>
      <h1 className="text-2xl font-bold mb-4">Conditions générales d&rsquo;utilisation</h1>
      <div className="space-y-4 text-sm text-secondary leading-relaxed">
        <h2 className="text-theme font-semibold text-base">1. Acceptation</h2>
        <p>En créant un compte sur Erosia, tu acceptes les présentes conditions générales.</p>
        <h2 className="text-theme font-semibold text-base">2. Âge</h2>
        <p>L&rsquo;utilisation d&rsquo;Erosia est réservée aux personnes âgées de 18 ans ou plus.</p>
        <h2 className="text-theme font-semibold text-base">3. Comportement</h2>
        <p>Les utilisateurs s&rsquo;engagent à adopter un comportement respectueux. Tout contenu inapproprié, harcèlement ou usurpation d&rsquo;identité entraînera la suppression du compte.</p>
        <h2 className="text-theme font-semibold text-base">4. Données personnelles</h2>
        <p>Les données collectées sont utilisées uniquement dans le cadre du fonctionnement d&rsquo;Erosia. Tu peux demander la suppression de tes données à tout moment.</p>
        <h2 className="text-theme font-semibold text-base">5. Abonnement Premium</h2>
        <p>Le paiement de l&rsquo;abonnement Premium est non remboursable sauf disposition légale contraire. L&rsquo;abonnement est valable 30 jours à compter de l&rsquo;activation.</p>
        <h2 className="text-theme font-semibold text-base">6. Contact</h2>
        <p>Pour toute question : <a href="mailto:erosiahelp@hotmail.com" className="text-primary underline">erosiahelp@hotmail.com</a></p>
      </div>
    </div>
  )
}
