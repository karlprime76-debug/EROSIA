import Link from 'next/link'

export default function CguPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F0EB] p-6">
      <Link href="/register" className="inline-flex items-center gap-2 text-[#9E9488] hover:text-white transition mb-6 text-sm">&larr; Retour</Link>
      <h1 className="text-2xl font-bold mb-4">Conditions générales d&rsquo;utilisation</h1>
      <div className="space-y-4 text-sm text-[#9E9488] leading-relaxed">
        <h2 className="text-white font-semibold text-base">1. Acceptation</h2>
        <p>En créant un compte sur Erosia, tu acceptes les présentes conditions générales.</p>
        <h2 className="text-white font-semibold text-base">2. Âge</h2>
        <p>L&rsquo;utilisation d&rsquo;Erosia est réservée aux personnes âgées de 18 ans ou plus.</p>
        <h2 className="text-white font-semibold text-base">3. Comportement</h2>
        <p>Les utilisateurs s&rsquo;engagent à adopter un comportement respectueux. Tout contenu inapproprié, harcèlement ou usurpation d&rsquo;identité entraînera la suppression du compte.</p>
        <h2 className="text-white font-semibold text-base">4. Données personnelles</h2>
        <p>Les données collectées sont utilisées uniquement dans le cadre du fonctionnement d&rsquo;Erosia. Tu peux demander la suppression de tes données à tout moment.</p>
        <h2 className="text-white font-semibold text-base">5. Abonnement Premium</h2>
        <p>Le paiement de l&rsquo;abonnement Premium est non remboursable sauf disposition légale contraire. L&rsquo;abonnement est valable 30 jours à compter de l&rsquo;activation.</p>
        <h2 className="text-white font-semibold text-base">6. Contact</h2>
        <p>Pour toute question : <a href="mailto:support@erosia.app" className="text-[#D92D4A] underline">support@erosia.app</a></p>
      </div>
    </div>
  )
}
