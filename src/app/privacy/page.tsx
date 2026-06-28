import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F0EB] p-6">
      <Link href="/login" className="inline-flex items-center gap-2 text-[#9E9488] hover:text-white transition mb-6">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Retour
      </Link>
      <h1 className="text-2xl font-bold mb-4">Politique de confidentialité</h1>
      <div className="space-y-4 text-sm text-[#9E9488] leading-relaxed">
        <p>Erosia s&rsquo;engage à protéger la vie privée de ses utilisateurs.</p>
        <h2 className="text-white font-semibold text-base">Données collectées</h2>
        <p>Nous collectons les informations que vous fournissez lors de la création du profil : nom, âge, photos, centre d&rsquo;intérêts, localisation approximative.</p>
        <h2 className="text-white font-semibold text-base">Utilisation des données</h2>
        <p>Vos données sont utilisées uniquement pour le fonctionnement de l&rsquo;application : matching, messagerie, suggestions de profils.</p>
        <h2 className="text-white font-semibold text-base">Partage des données</h2>
        <p>Nous ne revendons aucune donnée personnelle. Les informations de profil sont visibles par les autres utilisateurs selon vos paramètres.</p>
        <h2 className="text-white font-semibold text-base">Suppression</h2>
        <p>Vous pouvez supprimer votre compte à tout moment depuis les paramètres. Toutes vos données seront effacées.</p>
        <h2 className="text-white font-semibold text-base">Contact</h2>
        <p>Pour toute question : contact@erosia.app</p>
        <p className="text-xs mt-8">Dernière mise à jour : juin 2026</p>
      </div>
    </div>
  )
}
