import Link from 'next/link'

export const metadata = {
  title: 'Politique de confidentialité | Erosia',
  description: "Politique de confidentialité de l'application de rencontres Erosia — données collectées, utilisation, partage et suppression.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-theme text-theme p-6 max-w-3xl mx-auto">
      <Link href="/settings" className="inline-flex items-center gap-2 text-secondary hover:text-theme transition mb-6 text-sm">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Retour
      </Link>
      <h1 className="text-2xl font-bold mb-4">Politique de confidentialité</h1>
      <div className="space-y-4 text-sm text-secondary leading-relaxed">
        <p>Erosia s&rsquo;engage à protéger la vie privée de ses utilisateurs conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés.</p>

        <h2 className="text-theme font-semibold text-base">1. Responsable du traitement</h2>
        <p>Le responsable du traitement des données est Erosia, édité par la société Erosia SAS. Pour toute question : <a href="mailto:erosiahelp@hotmail.com" className="text-primary underline">erosiahelp@hotmail.com</a>.</p>

        <h2 className="text-theme font-semibold text-base">2. Données collectées</h2>
        <p>Nous collectons les catégories de données suivantes :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Données d&rsquo;inscription</strong> : nom, email, âge, genre, orientation, mot de passe (chiffré).</li>
          <li><strong>Données de profil</strong> : photos, bio, centres d&rsquo;intérêt, occupation, localisation approximative.</li>
          <li><strong>Données de navigation</strong> : logs de connexion, pages visitées, interactions, préférences.</li>
          <li><strong>Données de paiement</strong> : informations de transaction via PayDunya (aucun numéro de carte bancaire n&rsquo;est stocké par Erosia).</li>
          <li><strong>Données de vérification</strong> : documents d&rsquo;identité via Didit (chiffrés, conservés 90 jours).</li>
        </ul>

        <h2 className="text-theme font-semibold text-base">3. Base légale du traitement</h2>
        <p>Le traitement de vos données repose sur :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>L&rsquo;exécution du contrat (utilisation de l&rsquo;application) ;</li>
          <li>Votre consentement (photos, localisation, notifications) ;</li>
          <li>Notre intérêt légitime (amélioration du service, sécurité, modération).</li>
        </ul>

        <h2 className="text-theme font-semibold text-base">4. Finalités du traitement</h2>
        <p>Vos données sont utilisées pour :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Créer et gérer votre compte ;</li>
          <li>Vous proposer des profils compatibles (matching) ;</li>
          <li>Permettre la messagerie entre utilisateurs ;</li>
          <li>Assurer la modération et la sécurité de la plateforme ;</li>
          <li>Traiter les transactions (cadeaux, abonnements) ;</li>
          <li>Vérifier votre identité ;</li>
          <li>Vous envoyer des notifications (avec votre consentement).</li>
        </ul>

        <h2 className="text-theme font-semibold text-base">5. Destinataires des données</h2>
        <p>Vos données peuvent être partagées avec :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Les autres utilisateurs (selon vos paramètres de visibilité) ;</li>
          <li>Nos sous-traitants techniques : Supabase (hébergement DB), Vercel (hébergement), PayDunya (paiements), Didit (vérification d&rsquo;identité) ;</li>
          <li>Les autorités compétentes en cas d&rsquo;obligation légale.</li>
        </ul>
        <p>Nous ne revendons aucune donnée personnelle à des tiers.</p>

        <h2 className="text-theme font-semibold text-base">6. Transferts internationaux</h2>
        <p>Certains de nos sous-traitants peuvent être situés en dehors de l&rsquo;Union Européenne. Les transferts sont encadrés par des clauses contractuelles types (CCT) approuvées par la Commission Européenne.</p>

        <h2 className="text-theme font-semibold text-base">7. Durée de conservation</h2>
        <p>Vos données sont conservées pendant toute la durée de votre compte. Après suppression du compte, les données sont définitivement effacées sous 30 jours. Les logs de connexion sont conservés 12 mois. Les documents d&rsquo;identité (Didit) sont conservés 90 jours.</p>

        <h2 className="text-theme font-semibold text-base">8. Vos droits RGPD</h2>
        <p>Conformément au RGPD, vous disposez des droits suivants :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Droit d&rsquo;accès</strong> : obtenir une copie de vos données ;</li>
          <li><strong>Droit de rectification</strong> : modifier vos données inexactes ;</li>
          <li><strong>Droit à l&rsquo;effacement</strong> : supprimer votre compte et vos données ;</li>
          <li><strong>Droit à la limitation</strong> : restreindre le traitement de vos données ;</li>
          <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré ;</li>
          <li><strong>Droit d&rsquo;opposition</strong> : vous opposer au traitement pour l&rsquo;intérêt légitime.</li>
        </ul>
        <p>Pour exercer vos droits, contactez-nous à <a href="mailto:erosiahelp@hotmail.com" className="text-primary underline">erosiahelp@hotmail.com</a>. Vous pouvez également supprimer votre compte depuis les paramètres de l&rsquo;application.</p>

        <h2 className="text-theme font-semibold text-base">9. Cookies et traceurs</h2>
        <p>Erosia utilise des cookies strictement nécessaires au fonctionnement de l&rsquo;application (session, authentification). Aucun cookie publicitaire ou tiers n&rsquo;est utilisé. Vous pouvez configurer vos préférences dans les paramètres de votre navigateur.</p>

        <h2 className="text-theme font-semibold text-base">10. Sécurité</h2>
        <p>Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données : chiffrement TLS, hachage des mots de passe (bcrypt), accès restreint aux bases de données, audits de sécurité réguliers.</p>

        <h2 className="text-theme font-semibold text-base">11. Réclamation</h2>
        <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL (Commission Nationale de l&rsquo;Informatique et des Libertés) : <a href="https://www.cnil.fr" className="text-primary underline" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>.</p>

        <h2 className="text-theme font-semibold text-base">12. Contact</h2>
        <p>Pour toute question relative à vos données personnelles : <a href="mailto:erosiahelp@hotmail.com" className="text-primary underline">erosiahelp@hotmail.com</a></p>

        <p className="text-xs mt-8">Dernière mise à jour : juillet 2026</p>
      </div>
    </div>
  )
}
