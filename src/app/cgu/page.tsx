import Link from 'next/link'

export const metadata = {
  title: "Conditions générales d'utilisation | Erosia",
  description: "Conditions générales d'utilisation de l'application de rencontres Erosia — acceptation, âge, comportement, données personnelles, abonnement Premium.",
}

export default function CguPage() {
  return (
    <div className="min-h-screen bg-theme text-theme p-6 max-w-3xl mx-auto">
      <Link href="/settings" className="inline-flex items-center gap-2 text-secondary hover:text-theme transition mb-6 text-sm">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Retour
      </Link>
      <h1 className="text-2xl font-bold mb-4">Conditions générales d&rsquo;utilisation</h1>
      <div className="space-y-4 text-sm text-secondary leading-relaxed">
        <h2 className="text-theme font-semibold text-base">1. Acceptation des conditions</h2>
        <p>En créant un compte sur Erosia, vous acceptez sans réserve les présentes conditions générales d&rsquo;utilisation (CGU). Si vous ne les acceptez pas, veuillez ne pas utiliser l&rsquo;application.</p>

        <h2 className="text-theme font-semibold text-base">2. Conditions d&rsquo;accès</h2>
        <p>L&rsquo;utilisation d&rsquo;Erosia est réservée aux personnes âgées de 18 ans ou plus. En créant un compte, vous certifiez avoir 18 ans ou plus. Tout compte appartenant à un mineur sera supprimé sans préavis.</p>

        <h2 className="text-theme font-semibold text-base">3. Création de compte</h2>
        <p>Vous vous engagez à fournir des informations exactes et à jour lors de l&rsquo;inscription. Chaque compte est personnel et non transférable. Vous êtes responsable de la confidentialité de votre mot de passe.</p>

        <h2 className="text-theme font-semibold text-base">4. Comportement des utilisateurs</h2>
        <p>Les utilisateurs s&rsquo;engagent à :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Adopter un comportement respectueux envers les autres utilisateurs ;</li>
          <li>Ne pas publier de contenu inapproprié, offensant, discriminatoire ou illégal ;</li>
          <li>Ne pas usurper l&rsquo;identité d&rsquo;une personne physique ou morale ;</li>
          <li>Ne pas solliciter des mineurs ;</li>
          <li>Ne pas utiliser l&rsquo;application à des fins commerciales ou publicitaires ;</li>
          <li>Ne pas tenter de contourner les systèmes de modération ou de sécurité ;</li>
          <li>Ne pas partager de coordonnées personnelles (téléphone, adresse) avant d&rsquo;avoir établi une relation de confiance.</li>
        </ul>

        <h2 className="text-theme font-semibold text-base">5. Sanctions</h2>
        <p>En cas de non-respect des CGU, Erosia se réserve le droit de :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Avertir l&rsquo;utilisateur ;</li>
          <li>Supprimer les contenus litigieux ;</li>
          <li>Suspendre temporairement le compte ;</li>
          <li>Supprimer définitivement le compte sans préavis ni remboursement.</li>
        </ul>

        <h2 className="text-theme font-semibold text-base">6. Contenu généré par les utilisateurs</h2>
        <p>Vous conservez la propriété intellectuelle de vos contenus (photos, bio, messages). En les publiant sur Erosia, vous nous accordez une licence non exclusive, gratuite et limitée au fonctionnement de l&rsquo;application (affichage, stockage, modération).</p>

        <h2 className="text-theme font-semibold text-base">7. Abonnement Premium et achats</h2>
        <p>L&rsquo;abonnement Premium et les achats de cadeaux sont des services numériques :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Le paiement est effectué via PayDunya (Mobile Money ou carte bancaire) ;</li>
          <li>L&rsquo;abonnement Premium est valable 30 jours à compter de l&rsquo;activation ;</li>
          <li>Conformément à l&rsquo;article L221-28 du Code de la consommation, le droit de rétractation ne s&rsquo;applique pas aux services numériques pleinement exécutés ;</li>
          <li>Aucun remboursement n&rsquo;est accordé pour les abonnements ou cadeaux déjà livrés, sauf disposition légale contraire ;</li>
          <li>Erosia se réserve le droit de modifier les prix à tout moment, sous réserve d&rsquo;une information préalable.</li>
        </ul>

        <h2 className="text-theme font-semibold text-base">8. Disponibilité du service</h2>
        <p>Erosia s&rsquo;efforce d&rsquo;assurer une disponibilité maximale du service, sans garantie absolue. Des opérations de maintenance peuvent entraîner des interruptions temporaires. Erosia ne saurait être tenu responsable des dommages indirects liés à l&rsquo;indisponibilité du service.</p>

        <h2 className="text-theme font-semibold text-base">9. Responsabilité</h2>
        <p>Erosia agit comme une plateforme de mise en relation. Nous ne sommes pas responsables des interactions entre utilisateurs ni des comportements en dehors de l&rsquo;application. L&rsquo;utilisation de l&rsquo;application se fait sous votre seule responsabilité.</p>

        <h2 className="text-theme font-semibold text-base">10. Propriété intellectuelle</h2>
        <p>L&rsquo;application Erosia, son nom, son logo, son design et son code source sont la propriété exclusive d&rsquo;Erosia SAS. Toute reproduction ou utilisation non autorisée est interdite.</p>

        <h2 className="text-theme font-semibold text-base">11. Données personnelles</h2>
        <p>L&rsquo;utilisation d&rsquo;Erosia est soumise à notre <Link href="/privacy" className="text-primary underline">politique de confidentialité</Link> qui décrit comment nous collectons, utilisons et protégeons vos données personnelles.</p>

        <h2 className="text-theme font-semibold text-base">12. Loi applicable et litiges</h2>
        <p>Les présentes CGU sont soumises au droit français. En cas de litige, les parties s&rsquo;engagent à rechercher une solution amiable avant toute action judiciaire. À défaut, les tribunaux compétents seront ceux du ressort de la cour d&rsquo;appel de Paris.</p>

        <h2 className="text-theme font-semibold text-base">13. Modification des CGU</h2>
        <p>Erosia se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des modifications substantielles par email ou via l&rsquo;application. L&rsquo;utilisation continue de l&rsquo;application après modification vaut acceptation des nouvelles conditions.</p>

        <h2 className="text-theme font-semibold text-base">14. Contact</h2>
        <p>Pour toute question relative aux CGU : <a href="mailto:erosiahelp@hotmail.com" className="text-primary underline">erosiahelp@hotmail.com</a></p>

        <p className="text-xs mt-8">Dernière mise à jour : juillet 2026</p>
      </div>
    </div>
  )
}
